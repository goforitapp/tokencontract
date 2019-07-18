Abstract
========

Technical specifications for the smart contracts of the GoForIt Token.


Token Contract
==============

The token contract implements an ERC20 standard token.
It is named "Goin Token".
The ticker symbol will be GOI.
The number of decimals will be 18 to keep the resolution identical to ETH.
We rely on the broadly trusted Open Zeppelin v2.3.0 implementation of an ERC20 compliant Token. The following extensions are used:

Burnable
--------
The token be burnable using the BurnableToken from OpenZeppelin.


Constructor
-----------

During deployment 12,500,000,000 tokens will be minted.

  |Pool            |           Cap |Distribution time                               |
  |----------------|---------------|------------------------------------------------|
  |Private sale    | 5,511,842,425 | minted into 12 month vesting contract          |
  |Public sale     | 1,250,000,000 | minted to company wallet                       |
  |Bounty          |   181,250,000 | minted to company wallet                       |
  |Team            | 1,100,000,000 | minted to 24 month vesting contract            |
  |Company         | 3,369,407,575 | minted into 12 month vesting contract          |
  |Advisors        | 1,087,500,000 | The advisor pool is split into two parts       |
  |Advisors 25%    |   271,875,000 | minted to 6 month vesting contract             |
  |Advisors 75%    |   815,625,000 | minted to 24 month vesting contract            |              
  |Total Cap       |12,500,000,000 |                                                |


MultiSignature Wallets
======================
The Company wallet will be a Multisignature contracts. For the MultiSig wallet we will use the latest version of the Gnosis (ConsenSys) Multisignature Wallets (https://github.com/gnosis/MultiSigWallet)

The following requirements have to be fulfilled for deployment of the MultiSig wallets.

|Requirement                                      | Source  |       Value               |
|-------------------------------------------------|---------|---------------------------|
|Number of addresses in the MultiSig wallet       | GoForIt |                           |
|Number of verifications to confirm transactions  | GoForIt |                           |
|List of owner addresses of the MultiSig wallet   | GoForIt |                           |

Token vesting contract
======================
There will be several Vesting contracts with different vesting period.
The vesting contract will be deployed by the token contract during deployment.
The owner of a vesting contract can enter the beneficiaries and amount of the beneficiary.
After the end of the vesting period, anybody can call a function to release the tokens from the vesting contract to the beneficiary of the vesting contract.


Project Timeline
================

  |Date                  | Event                                             |
  |----------------------|---------------------------------------------------|
  |                      | Multisig contract deployment                      |
  |           201?-??-?? | Token contract deployment                         |
  |                      | Etherscan code verification                       |



Deployment Requirements
=======================

The following requirements have to be fulfilled at deployment time


|Requirement                | Source  |       Value                              |
|---------------------------|---------|------------------------------------------|
|Name of Token              | GoForIt | Goin Token                               |
|Symbol of Token            | GoForIt | GOI                                      |
|Prize of Token             | GoForIt | 0,0004 €                                 |


Deployment method
-----------------

The contracts will be deployed manually, using remixd on a synchronized full node.
