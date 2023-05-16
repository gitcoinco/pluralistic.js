export interface Contribution {
  contributor: string;
  recipient: string;
  amount: bigint;
}

type AggregatedContribution = {
  totalReceived: bigint;
  contributions: { [contributor: string]: bigint };
};

type AggregatedContributions = {
  totalReceived: bigint;
  list: {
    [recipient: string]: AggregatedContribution;
  };
};

const BigIntMath = {
  // Babylonian method
  sqrt: (n: bigint) => {
    if (n < 0n) {
      throw new Error("Square root of negative numbers is not supported.");
    }

    if (n === 0n || n === 1n) {
      return n;
    }

    // better initial guess with n / 2
    let x = n >> 1n;
    let y = (x + 1n) >> 1n;

    while (y < x) {
      x = y;
      y = (x + n / x) >> 1n;
    }

    return x;
  },

  pow: (x: bigint, y: bigint) => x ** y,
};

export type LinearQFOptions = {
  minimumAmount: bigint;
  ignoreSaturation: boolean;
  matchingCapAmount: bigint | undefined; // an amount, not a percentage
};

export type Calculation = {
  totalReceived: bigint;
  contributionsCount: bigint;
  sumOfSqrt: bigint;
  capOverflow: bigint;
  matchedWithoutCap: bigint;
  matched: bigint;
};

export type RecipientsCalculations = {
  [recipient: string]: Calculation;
};

const defaultLinearQFOptions = (): LinearQFOptions => ({
  minimumAmount: 0n,
  ignoreSaturation: false,
  matchingCapAmount: undefined,
});

const newCalculation = (totalReceived: bigint): Calculation => ({
  totalReceived,
  contributionsCount: 0n,
  sumOfSqrt: 0n,
  capOverflow: 0n,
  matchedWithoutCap: 0n,
  matched: 0n,
});

export const aggregateContributions = (
  contributions: Contribution[],
  options: LinearQFOptions
): AggregatedContributions => {
  const ag: AggregatedContributions = {
    totalReceived: 0n,
    list: {},
  };

  for (const contribution of contributions) {
    if (contribution.amount < options.minimumAmount) {
      continue;
    }

    ag.list[contribution.recipient] ||= {
      totalReceived: 0n,
      contributions: {},
    };

    ag.totalReceived += contribution.amount;
    ag.list[contribution.recipient].totalReceived += contribution.amount;
    ag.list[contribution.recipient].contributions[contribution.contributor] ||=
      0n;
    ag.list[contribution.recipient].contributions[contribution.contributor] +=
      contribution.amount;
  }

  return ag;
};

export const linearQF = (
  rawContributions: Contribution[],
  matchAmount: bigint,
  decimalsPrecision: bigint,
  options: LinearQFOptions = defaultLinearQFOptions()
) => {
  const aggregated: AggregatedContributions = aggregateContributions(
    rawContributions,
    options
  );
  const calculations: RecipientsCalculations = {};

  let totalSqrtSum = 0n;

  // for each recipient in aggregated.list we calculate the sum
  // of sqrt in the calculations object,
  // and we sum all the sqrt in totalSqrtSum
  for (const recipient in aggregated.list) {
    let totalRecipientSqrtSum = 0n;
    // for each recipient contribution aggregated by contributor
    for (const contributor in aggregated.list[recipient].contributions) {
      const amount = aggregated.list[recipient].contributions[contributor];
      const sqrt = BigIntMath.sqrt(amount);

      calculations[recipient] ||= newCalculation(
        aggregated.list[recipient].totalReceived
      );

      calculations[recipient].contributionsCount += 1n;
      calculations[recipient].sumOfSqrt += sqrt;
      totalRecipientSqrtSum += sqrt;
    }

    if (calculations[recipient].contributionsCount > 1) {
      totalSqrtSum +=
        BigIntMath.pow(totalRecipientSqrtSum, 2n) -
        calculations[recipient].totalReceived;
    }
  }

  let totalCapOverflow = 0n;
  let totalUnderCap = 0n;
  let totalMatchedFromUncapped = 0n;
  let totalQFMatches = 0n;

  // for each recipient in calculations
  // we calculate the final match based on
  // its sqrt and the totalSqrtSum
  for (const recipient in calculations) {
    let val = 0n;
    if (calculations[recipient].contributionsCount > 1n) {
      val =
        BigIntMath.pow(calculations[recipient].sumOfSqrt, 2n) -
        calculations[recipient].totalReceived;
    }

    totalQFMatches += val;

    let match = 0n;

    if (totalSqrtSum > 0) {
      // match based on the total matchAmount, we will scale down
      // later after this loop if the round is not saturated
      match = (val * matchAmount) / totalSqrtSum;
    }

    calculations[recipient].matchedWithoutCap = match;
    calculations[recipient].matched = match;
  }

  // Check if the round is saturated
  // If the round is not saturated we scale down do the actual qfMatch
  if (totalQFMatches < matchAmount && options.ignoreSaturation === false) {
    for (const recipient in calculations) {
      const qfMatch =
        BigIntMath.pow(calculations[recipient].sumOfSqrt, 2n) -
        calculations[recipient].totalReceived;

      calculations[recipient].matched = qfMatch;
      calculations[recipient].matchedWithoutCap = qfMatch;
    }
  }

  const recipientsUnderCap: Array<string> = [];

  // Check cap overflows
  if (options.matchingCapAmount !== undefined) {
    for (const recipient in calculations) {
      const match = calculations[recipient].matched;
      // negative if lower than the cap
      const capOverflow = match - options.matchingCapAmount;
      calculations[recipient].capOverflow = capOverflow;

      if (capOverflow > 0n) {
        calculations[recipient].matched = options.matchingCapAmount;
        totalCapOverflow += capOverflow;
      } else {
        totalUnderCap = totalUnderCap - capOverflow;
        totalMatchedFromUncapped += match;
        recipientsUnderCap.push(recipient);
      }
    }
  }

  // Sort recipient without cap by match descending
  recipientsUnderCap.sort((a, b) =>
    calculations[a].matched > calculations[b].matched ? -1 : 1
  );

  // if everyone is over the cap, but there's no one eligible
  // for the distribution of the overflow
  if (totalMatchedFromUncapped === 0n) {
    return calculations;
  }

  if (options.matchingCapAmount !== undefined && totalCapOverflow > 0n) {
    // redistribute the totalCapOverflow to all

    for (let i = 0; i < recipientsUnderCap.length; i++) {
      const recipient = recipientsUnderCap[i];

      // recipientOverflow is negative so we can distribute something
      // to the current recipient
      // matched : totalMatchedFromUncapped = x : totalCapOverflow

      const additionalMatch =
        (calculations[recipient].matched * totalCapOverflow) /
        totalMatchedFromUncapped;

      let newMatch = calculations[recipient].matched + additionalMatch;

      if (newMatch >= options.matchingCapAmount) {
        const distributed =
          options.matchingCapAmount - calculations[recipient].matched;
        newMatch = options.matchingCapAmount;
      }

      calculations[recipient].matched = newMatch;
    }
  }

  return calculations;
};
