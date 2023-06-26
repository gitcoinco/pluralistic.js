# Pluralistic.js:  Quadratic Funding Calculation Script

This JavaScript code calculates quadratic funding based on contributions.

## Overview

The code aggregates contributions and calculates matching funds using a linear quadratic funding formula. 

## Data Structures

- `Contribution`: Represents a contribution made by a contributor to a recipient.
- `AggregatedContribution`: Represents the total contributions received by a recipient, and a map of contributions by each contributor.
- `AggregatedContributions`: Represents the total contributions received and a list of `AggregatedContribution` by recipient.
- `Calculation`: Represents the total received, contribution count, sum of square roots, cap overflow, matched without cap, and matched amounts for a recipient.
- `RecipientsCalculations`: A map of `Calculation` by recipient.

## Functions

- `BigIntMath.sqrt` and `BigIntMath.pow`: Helper functions for performing square root and power operations on BigInt numbers.
- `aggregateContributions`: Aggregates contributions by recipient and contributor. It excludes contributions below the minimum amount.
- `linearQF`: Performs quadratic funding calculation.
  - It first aggregates the contributions.
  - For each recipient, it calculates the sum of square roots of the contributions.
  - It then calculates the match for each recipient based on the sum of square roots, total sum of square roots, and the match amount.
  - If a cap is set and the match exceeds the cap, it reduces the match to the cap and calculates the cap overflow.
  - If there is a total cap overflow, it redistributes the cap overflow to recipients who have not reached the cap.

## Usage

1. Create an array of `Contribution` objects.
2. Call the `linearQF` function with the array of contributions, match amount, decimal precision, and optional `LinearQFOptions` object.
3. The function returns a `RecipientsCalculations` object that contains the matching funds for each recipient.

Note: The code assumes that contributions and amounts are represented as BigInt numbers.
