"use strict";

const ERC20 = artifacts.require("IERC20");
const GoForItToken = artifacts.require("GoForItToken.sol");
const TokenVesting = artifacts.require("TokenVesting.sol");

const {toBN, randomHex} = web3.utils;
const {expect} = require("chai").use(require("chai-bn")(web3.utils.BN));
const {time, reject, snapshot} = require("./helpers/all");

const ADDRESS_BYTES = 160 >> 3;
const ZERO_ADDRESS = "0x" + "0".repeat(2 * ADDRESS_BYTES);
const toTokens = value => toBN(value.toString().replace(/,/g, "") + "0".repeat(18));


contract("GoForItToken", ([deployer, beneficiary1, beneficiary2, beneficiary3, anyone]) => {
    const TOTAL_TOKEN_SUPPLY = toTokens("12,500,000,000");

    // Default constructor arguments (should successfully deploy)
    const defaultParams = {
        beneficiaries: [beneficiary1, beneficiary2, beneficiary3],
        vestingInDays: [10, 0, 20].map(toBN),
        vestedAmounts: (() => {
            let vestedAmount1 = toTokens("10");
            let vestedAmount2 = toTokens("10,000,000");
            let vestedAmount3 = TOTAL_TOKEN_SUPPLY.sub(vestedAmount1).sub(vestedAmount2);
            return [vestedAmount1, vestedAmount2, vestedAmount3];
        })(),
    };

    // Returns a promise that will deploy a new GoForItToken instance
    const deployToken =
        (params={}) => GoForItToken.new(params.beneficiaries || defaultParams.beneficiaries,
                                        params.vestingInDays || defaultParams.vestingInDays,
                                        params.vestedAmounts || defaultParams.vestedAmounts,
                                        {from: deployer});

    // *** Preliminary tests to ensure the unit tests are meaningful

    before("ensure all beneficiaries are distinct", async () => {
        let beneficiaries = defaultParams.beneficiaries;
        expect((new Set(beneficiaries)).size).to.equal(beneficiaries.length);
    });

    before("ensure at least one vesting period is zero", async () => {
        expect(defaultParams.vestingInDays.some(days => days.isZero())).to.be.true;
    });

    before("ensure at least one vesting period is not zero", async () => {
        expect(defaultParams.vestingInDays.some(days => !days.isZero())).to.be.true;
    });

    before("ensure all vested amounts are non zero", async () => {
        expect(defaultParams.vestedAmounts.every(amount => !amount.isZero())).to.be.true;
    });

    // *** Unit tests

    describe("interface", () => {

        const adheresTo = (node, definition) =>
            node.type === "function" && definition.type === "function"
            && node.name === definition.name
            && node.inputs.length === definition.inputs.length
            && node.inputs.every((param, i) => param.type === definition.inputs[i].type)
            && node.payable === definition.payable
            && node.stateMutability === definition.stateMutability
            && (node.outputs === undefined && definition.outputs === undefined
                || node.outputs.length === definition.outputs.length
                && node.outputs.every((param, i) => param.type === definition.outputs[i].type));

        it("adheres to ERC20", async () => {
            for (let definition of ERC20.abi.filter(node => node.type === "function").values()) {
                let node = GoForItToken.abi.find(node => adheresTo(node, definition));

                expect(node,`function ${definition.name}`).to.exist;
            }
        });
    });

    describe("deployment", () => {

        it("fails if #beneficiaries < #vestingInDays", async () => {
            let beneficiaries = defaultParams.beneficiaries.slice(1);
            let reason = await reject.deploy(deployToken({beneficiaries}));
            expect(reason).to.equal("array length does not match");
        });

        it("fails if #vestingInDays < #amounts", async () => {
            let vestingInDays = defaultParams.vestingInDays.slice(1);
            let reason = await reject.deploy(deployToken({vestingInDays}));
            expect(reason).to.equal("array length does not match");
        });

        it("fails if #amounts < #beneficiaries", async () => {
            let vestedAmounts = defaultParams.vestedAmounts.slice(1);
            let reason = await reject.deploy(deployToken({vestedAmounts}));
            expect(reason).to.equal("array length does not match");
        });

        it("fails if ∑amounts < TOTALTOKENSUPPLY", async () => {
            let vestedAmounts = defaultParams.vestedAmounts.slice();
            vestedAmounts[1] = vestedAmounts[1].sub(toBN(1));
            let reason = await reject.deploy(deployToken({vestedAmounts}));
            expect(reason).to.equal("totalsupply does not match");
        });

        it("fails if ∑amounts > TOTALTOKENSUPPLY", async () => {
            let vestedAmounts = defaultParams.vestedAmounts.slice();
            vestedAmounts[1] = vestedAmounts[1].add(toBN(1));
            let reason = await reject.deploy(deployToken({vestedAmounts}));
            expect(reason).to.equal("totalsupply does not match");
        });

        it("fails if there are two vestings for same beneficiary", async () => {
            let params = {
                beneficiaries: defaultParams.beneficiaries.concat(defaultParams.beneficiaries),
                vestingInDays: defaultParams.vestingInDays.concat(defaultParams.vestingInDays),
                vestedAmounts: defaultParams.vestedAmounts.concat(defaultParams.vestedAmounts),
            };
            let reason = await reject.deploy(deployToken(params));
            expect(reason).to.equal("only 1 contract per address");
        });

        it("is possible", async () => {
            let token = await deployToken();
            let code = await web3.eth.getCode(token.address);
            expect(code).to.be.not.oneOf(["0x", "0x0"]);
        });

        it("sets correct totalSupply", async () => {
            let token = await deployToken();
            expect(await token.totalSupply()).to.be.bignumber.equal(TOTAL_TOKEN_SUPPLY);
        });

        it("mints for beneficiary only if there's no vesting period", async () => {
            let token = await deployToken();
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingInDays = defaultParams.vestingInDays[i];
                let vestedAmount = defaultParams.vestedAmounts[i];
                let balance = await token.balanceOf(beneficiary);
                if (vestingInDays.isZero()) {
                    expect(balance).to.be.bignumber.equal(vestedAmount);
                } else {
                    expect(balance).to.be.zero;
                }
            }
        });

        it("deploys a vesting contract only if there's a vesting period", async () => {
            let token = await deployToken();
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingInDays = defaultParams.vestingInDays[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                let vestedAmount = defaultParams.vestedAmounts[i];
                if (vestingInDays.isZero()) {
                    expect(vestingAddress).to.equal(ZERO_ADDRESS);
                }
                else {
                    expect(vestingAddress).to.not.equal(ZERO_ADDRESS);
                    let code = await web3.eth.getCode(vestingAddress);
                    expect(code).to.be.not.oneOf(["0x", "0x0"]);
                    let balance = await token.balanceOf(vestingAddress);
                    expect(balance).to.be.bignumber.equal(vestedAmount);
                }
            }
        });

        it("emits correct Transfer events", async () => {
            let token = await deployToken();
            let events = await token.getPastEvents("Transfer");
            expect(events).to.have.lengthOf(defaultParams.beneficiaries.length);
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingInDays = defaultParams.vestingInDays[i];
                let vestedAmount = defaultParams.vestedAmounts[i];
                if (vestingInDays.isZero()) {
                    let event = events.find(event => event.args.to === beneficiary
                                                     && event.args.value.eq(vestedAmount));
                    expect(event).to.exist;
                }
                else {
                    let vestingAddress = await token.vestingContracts(beneficiary);
                    let event = events.find(event => event.args.to === vestingAddress
                                                     && event.args.value.eq(vestedAmount));
                    expect(event).to.exist;
                }
            }
        });

        it("emits correct TokenVested events", async () => {
            let count = defaultParams.vestingInDays.filter(days => !days.isZero()).length;
            let token = await deployToken();
            let events = await token.getPastEvents("TokenVested");
            expect(events).to.have.lengthOf(count);
            for (let event of events.values()) {
                let index = defaultParams.beneficiaries.indexOf(event.args.beneficiary);
                expect(index).to.be.at.least(0);
                let beneficiary = defaultParams.beneficiaries[index];
                let vestedAmount = defaultParams.vestedAmounts[index];
                expect(event.args.amount).to.be.bignumber.equal(vestedAmount);
                let vestingAddress = await token.vestingContracts(beneficiary);
                expect(event.args.contractAddress).to.equal(vestingAddress);
            }
        });

    });

    describe("token vesting", () => {

        it("has correct beneficiary", async () => {
            let token = await deployToken();
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                if (vestingAddress !== ZERO_ADDRESS) {
                    let vesting = await TokenVesting.at(vestingAddress);
                    expect(await vesting.beneficiary()).to.equal(beneficiary);
                }
            }
        });

        it("has correct start time", async () => {
            let token = await deployToken();
            let tx = await web3.eth.getTransaction(token.transactionHash);
            let txTime = (await web3.eth.getBlock(tx.blockNumber)).timestamp;
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                if (vestingAddress !== ZERO_ADDRESS) {
                    let vesting = await TokenVesting.at(vestingAddress);
                    expect((await vesting.start()).toNumber()).to.equal(txTime);
                }
            }
        });

        it("has correct cliff time", async () => {
            let token = await deployToken();
            let tx = await web3.eth.getTransaction(token.transactionHash);
            let txTime = (await web3.eth.getBlock(tx.blockNumber)).timestamp;
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                if (vestingAddress !== ZERO_ADDRESS) {
                    let cliff = txTime + time.days(defaultParams.vestingInDays[i].toNumber());
                    let vesting = await TokenVesting.at(vestingAddress);
                    expect((await vesting.cliff()).toNumber()).to.equal(cliff);
                }
            }
        });

        it("has correct duration", async () => {
            let token = await deployToken();
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                if (vestingAddress !== ZERO_ADDRESS) {
                    let duration = time.days(defaultParams.vestingInDays[i].toNumber());
                    let vesting = await TokenVesting.at(vestingAddress);
                    expect((await vesting.duration()).toNumber()).to.equal(duration);
                }
            }
        });

        it("has no linear period", async () => {
            let token = await deployToken();
            let tx = await web3.eth.getTransaction(token.transactionHash);
            let txTime = (await web3.eth.getBlock(tx.blockNumber)).timestamp;
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                if (vestingAddress !== ZERO_ADDRESS) {
                    let vesting = await TokenVesting.at(vestingAddress);
                    let cliff = (await vesting.cliff()).toNumber();
                    let duration = (await vesting.duration()).toNumber();
                    expect(txTime + duration).to.equal(cliff);
                }
            }
        });

        it("is not revocable", async () => {
            let token = await deployToken();
            for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
                let beneficiary = defaultParams.beneficiaries[i];
                let vestingAddress = await token.vestingContracts(beneficiary);
                if (vestingAddress !== ZERO_ADDRESS) {
                    let vesting = await TokenVesting.at(vestingAddress);
                    expect(await vesting.revocable()).to.be.false;
                }
            }
        });
    });

    describe("token releasing", () => {

        it("fails if no vesting was assigned", async () => {
            let token = await deployToken();
            let reason = await reject.call(token.release({from: anyone}));
            expect(reason).to.equal("no tokens vested");
        });

        for (let i = 0; i < defaultParams.beneficiaries.length; ++i) {
            let beneficiary = defaultParams.beneficiaries[i];
            let vestingInDays = defaultParams.vestingInDays[i];
            let vestedAmount = defaultParams.vestedAmounts[i];

            if (!vestingInDays.isZero()) {
                it("fails before end of vesting period", async () => {
                    let token = await deployToken();
                    await time.increaseBy(time.days(vestingInDays.toNumber()) - time.mins(1));
                    let reason = await reject.call(token.release({from: beneficiary}));
                    expect(reason).to.equal("TokenVesting: no tokens are due");
                });

                it("succeeds after vesting period", async () => {
                    let token = await deployToken();
                    let vestingAddress = await token.vestingContracts(beneficiary);
                    let vesting = await TokenVesting.at(vestingAddress);
                    await time.increaseBy(time.days(vestingInDays.toNumber()) + time.mins(1));
                    let balance = await token.balanceOf(vestingAddress);
                    await token.release({from: beneficiary});
                    expect(await token.balanceOf(beneficiary)).to.be.bignumber.equal(balance);
                    expect(await token.balanceOf(vestingAddress)).to.be.bignumber.zero;
                });
            }
        }
    });

    describe("deployment costs", () => {
        const CL_CYAN = "\u001b[36m";
        const CL_GRAY = "\u001b[90m";
        const CL_DEFAULT = "\u001b[0m";

        it("allows for many beneficiaries", async () => {
            let nSucc = 0, nFail = -1, nTest = 1;
            while (nTest != nSucc && nTest < 1024) {
                let beneficiaries = [randomHex(ADDRESS_BYTES)];
                let vestingInDays = [toBN(10)];
                let vestedAmounts = [TOTAL_TOKEN_SUPPLY];
                for (let i = 1; i < nTest; ++i) {
                    beneficiaries.push(randomHex(ADDRESS_BYTES));
                    vestingInDays.push(toBN(10));
                    vestedAmounts.push(toTokens(1));
                    vestedAmounts[0] = vestedAmounts[0].sub(toTokens(1));
                }
                let message = `for ${nTest} beneficiar${nTest == 1 ? "y" : "ies"}:`;
                let success;
                try {
                    let token = await deployToken({beneficiaries, vestingInDays, vestedAmounts});
                    let receipt = await web3.eth.getTransactionReceipt(token.transactionHash);
                    message += `\t${receipt.gasUsed} gas`;
                    success = true;
                }
                catch (error) {
                    message += "\tfailed";
                    success = false;
                }
                console.log(" ".repeat(6) + `${CL_CYAN}→ ${CL_GRAY}${message}${CL_DEFAULT}`);
                if (success) {
                    nSucc = nTest;
                    nTest = nFail < 0 ? 2 * nTest : (nTest + nFail) / 2 | 0;
                }
                else {
                    nFail = nTest;
                    nTest = (nSucc + nTest) / 2 | 0;
                }
            }
            expect(nSucc).to.be.at.above(2);
        });
    });

});


