"use strict";

// Transaction rejection related helper functions for testing smart
// contracts via truffle
// G. Baecker, Tecneos UG, 2019
const reject = {

    // Execute a single transaction (promise) and throw if
    // it succeeds or any not-transaction-related error occurs.
    tx:
        options => reject.call(new Promise((resolve, reject) => {
            try {
                resolve(web3.eth.sendTransaction(options));
            }
            catch (error) {
                reject(error);
            }
        })),

    // Deploy a contract and throw if it succeeds or any other
    // not-deployment-related error occurs.
    // Note: ensure deployer has enough funds and sends enough gas
    deploy:
        async promise => {
            try {
                await promise;
            }
            catch (error) {
                let message = error.toString().toLowerCase();

                // Deployment failed but no revert reason given
                if (message.includes("the contract code couldn't be stored")
                    || message.includes("invalid opcode")
                    || message.includes("invalid jump")) {
                    return; // pre-Byzantium rejection
                }

                // A revert error may include a revert reason
                if (message.includes("vm exception while processing transaction: revert")) {
                    return error.reason;
                }

                // Throw if the error is not related to the smart contract code
                throw error;
            }

            // Throw if no error occurred
            throw new Error("Contract creation should have failed but didn't.");
        },

    // Execute a call method single transaction (promise) and throw if
    // it succeeds or any not-transaction-related error occurs.
    call:
        async promise => {
            let successReason = "unknown"; // Why do we think that the transaction succeeded

            try {
                let tx = await promise;

                if (tx.hasOwnProperty("receipt")) {
                    let receipt = tx.receipt;

                    // Unfortunately, all cases where seen in the wild
                    if (receipt.status === 0
                     || receipt.status === "0x"
                     || receipt.status === "0x0") {
                        return; // post-Byzantium rejection
                    }

                    // Weird: Parity doesn't throw and doesn't deliver status
                    if (tx.receipt.status === null) {
                        tx = await web3.eth.getTransaction(receipt.transactionHash);

                        // Heuristic: compare gas provided with gas used
                        if (tx.gas === receipt.gasUsed) {
                            return; // most likely a rejection
                        }

                        successReason = "gasUsed < gasSent";
                    }
                    else {
                        successReason = "status = " + receipt.status;
                    }
                }
                else {
                    // A missing receipt may indicate a rejection,
                    // but we treat it as success to throw the error
                    successReason = "no receipt";
                }
            }
            catch (error) {
                let message = error.toString().toLowerCase();

                // Call failed but no revert reason given
                if (message.includes("invalid opcode") || message.includes("invalid jump")) {
                    return; // pre-Byzantium rejection
                }

                // A revert error may include a revert reason
                if (message.includes("vm exception while processing transaction: revert")) {
                    return error.reason;
                }

                throw error;
            }

            throw new Error("Transaction should have failed but didn't (" + successReason + ").");
        },

};


module.exports = reject;

