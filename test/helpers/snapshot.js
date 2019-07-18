"use strict";


// EVM snapshot related helper functions for testing smart contracts via truffle
// G. Baecker, Tecneos UG, 2019

// Create an EVM snapshot and return its id
const create = () =>
    new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync(
            {jsonrpc: "2.0", method: "evm_snapshot", id: time.now() + 1},
            (error, result) => {
                if (error) { reject(error); }
                else { resolve(result.result); }
            });
        });

// Revert to EVM state just before snapshot with the given id was created
const revert = id =>
    new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync(
            {jsonrpc: "2.0", method: "evm_revert", params: [id], id: time.now() + 1},
            (error, result) => {
                if (error) { reject(error); }
                else { resolve(result); }
            });
        });


// Snapshot object creation
const snapshot = {

    new:
        async () => {
            let id = await create();

            return {
                // Revert to EVM state just before this is snapshot was created
                // This snapshot object becomes invalid
                revert: () => revert(id),

                // Restore EVM state when this snapshot was created
                // This snapshot object is still valid
                restore: async () => {
                    await revert(id);
                    id = await create();
                }
            };
        },

};


module.exports = snapshot;

