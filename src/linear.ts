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

class LinearQFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinearQFError";
  }
}

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
  _decimalsPrecision: bigint, // FIXME: remove this
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

      // TODO: this is contributorCount
      calculations[recipient].contributionsCount += 1n;
      calculations[recipient].sumOfSqrt += sqrt;
      totalRecipientSqrtSum += sqrt;
    }

    if (calculations[recipient].contributionsCount > 1) {
      if (calculations[recipient].sumOfSqrt != totalRecipientSqrtSum) {
        throw new LinearQFError("Sum of sqrt is not equal to total sqrt sum.");
      }

      totalSqrtSum +=
        BigIntMath.pow(calculations[recipient].sumOfSqrt, 2n) -
        calculations[recipient].totalReceived;
    }
  }

  console.log("totalSqrtSum", totalSqrtSum);

  let totalQFMatches = 0n;

  // for each recipient in calculations
  // we calculate the final match based on
  // its sqrt and the totalSqrtSum
  for (const recipient in calculations) {
    let qfMatch = 0n;
    if (calculations[recipient].contributionsCount > 1n) {
      qfMatch =
        BigIntMath.pow(calculations[recipient].sumOfSqrt, 2n) -
        calculations[recipient].totalReceived;
    }

    totalQFMatches += qfMatch;

    let match = 0n;

    if (totalSqrtSum > 0) {
      // match based on the total matchAmount, we will scale down
      // later after this loop if the round is not saturated
      // qfMatch : totalQFMatches =  x : matchAmount
      match = (qfMatch * matchAmount) / totalSqrtSum;
    }

    calculations[recipient].matchedWithoutCap = match;
    calculations[recipient].matched = match;
  }

  let totalMatched = 0n;
  for (const id in calculations) {
    const result = calculations[id];
    totalMatched += result.matched;
  }

  console.log("totalMatched before cap", totalMatched);

  // Check if the round is saturated
  // If the round is not saturated we scale down do the actual qfMatch
  const scaleUp = options.ignoreSaturation === true;
  console.log("scaleUp", scaleUp);

  if (totalQFMatches < matchAmount && !scaleUp) {
    console.log("round is not saturated, scaling down");

    for (const recipient in calculations) {
      const qfMatch =
        BigIntMath.pow(calculations[recipient].sumOfSqrt, 2n) -
        calculations[recipient].totalReceived;

      calculations[recipient].matched = qfMatch;
      calculations[recipient].matchedWithoutCap = qfMatch;
    }

    let totalMatched = 0n;
    for (const id in calculations) {
      const result = calculations[id];
      totalMatched += result.matched;
    }

    console.log("totalMatched normalized", totalMatched);
  }

  // Check cap overflows
  if (options.matchingCapAmount !== undefined) {
    let totalCapOverflow;

    do {
      console.log("----------------------");

      totalCapOverflow = 0n;
      let totalMatchedFromUncapped = 0n;

      for (const recipient in calculations) {
        const match = calculations[recipient].matched;

        // maybe this doens't make sense if we're looping,
        // just calculate the original cap overflow for now
        calculations[recipient].capOverflow =
          calculations[recipient].matchedWithoutCap - options.matchingCapAmount;

        if (match > options.matchingCapAmount) {
          console.log("overflow", match - options.matchingCapAmount);
          totalCapOverflow += match - options.matchingCapAmount;
          calculations[recipient].matched = options.matchingCapAmount;
        } else if (match < options.matchingCapAmount) {
          // make sure we're only counting the uncapped matches
          totalMatchedFromUncapped += match;
        }
      }

      let totalMatchedAfterCap = 0n;

      for (const id in calculations) {
        const result = calculations[id];
        totalMatchedAfterCap += result.matched;
      }

      console.log(
        "totalMatched after cap                  :",
        totalMatchedAfterCap
      );

      // break the loop if there is no overflow or no uncapped matches
      if (totalMatchedFromUncapped === 0n || totalCapOverflow === 0n) {
        console.log("no overflow");
        break;
      }

      console.log(
        "totalCapOverflow                        :",
        totalCapOverflow
      );
      console.log(
        "totalMatchedFromUncapped                :",
        totalMatchedFromUncapped
      );
      console.log(
        "totalCapOverflow + totalMatchedAfterCap :",
        totalCapOverflow + totalMatchedAfterCap
      );

      if (totalCapOverflow + totalMatchedAfterCap > matchAmount) {
        throw new LinearQFError("Too large");
      }

      let distributed = 0n;

      for (const recipient in calculations) {
        // only distribute to those who are under the cap
        if (calculations[recipient].matched < options.matchingCapAmount) {
          // scale up the ratio of the uncapped match to the total uncapped match
          // because it should be between 0 and 1
          const additionalMatchScaled =
            (calculations[recipient].matched * totalCapOverflow) /
            totalMatchedFromUncapped;

          calculations[recipient].matched += additionalMatchScaled;
          distributed += additionalMatchScaled;
        }
      }

      if (distributed > totalCapOverflow) {
        throw new LinearQFError("Distributed more than totalCapOverflow");
      }
    } while (totalCapOverflow > 0n);
  }

  return calculations;
};
