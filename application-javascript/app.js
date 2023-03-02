/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const fs = require("fs");
const { Gateway, Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const path = require("path");
const {
  buildCAClient,
  registerAndEnrollUser,
  enrollAdmin,
} = require("./helper/CAUtil");
const { buildCCPOrg1, buildCCPOrg2, buildWallet } = require("./helper/AppUtil");

const channelName = "channel1";
const chaincodeName = "ECG";
const walletPath = path.join(__dirname, "wallet");
const org1UserId = "User1";
const orgSelector = "org1";
const mspOrg1 = orgSelector === "org2" ? "Org2MSP" : "Org1MSP";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let totalTry = 100;
let success = 0;
let fail = 0;
let keyStartsAt = 1000;

async function main() {
  try {
    // build an in memory object with the network configuration (also known as a connection profile)
    const ccp = orgSelector === "org2" ? buildCCPOrg2() : buildCCPOrg1();
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const org1User1Ca = fs.readFileSync(
      path.resolve(
        __dirname,
        "..",
        "organizations",
        "peerOrganizations",
        `${orgSelector}.example.com`,
        "users",
        `User1@${orgSelector}.example.com`,
        "msp",
        "signcerts",
        `User1@${orgSelector}.example.com-cert.pem`
      )
    );

    const org1User1Key = fs.readFileSync(
      path.resolve(
        __dirname,
        "..",
        "organizations",
        "peerOrganizations",
        `${orgSelector}.example.com`,
        "users",
        `User1@${orgSelector}.example.com`,
        "msp",
        "keystore",
        "priv_sk"
      )
    );

    const x509Identity = {
      credentials: {
        certificate: org1User1Ca.toString(),
        privateKey: org1User1Key.toString(),
      },
      mspId: mspOrg1,
      type: "X.509",
    };

    await wallet.put(org1UserId, x509Identity);

    const gateway = new Gateway();

    try {
      // setup the gateway instance
      // The user will now be able to create connections to the fabric network and be able to
      // submit transactions and query. All transactions submitted by this gateway will be
      // signed by this user using the credentials stored in the wallet.
      await gateway.connect(ccp, {
        wallet,
        identity: org1UserId,
        discovery: { enabled: true, asLocalhost: false }, // using asLocalhost as this gateway is using a fabric network deployed locally
      });

      // Build a network instance based on the channel where the smart contract is deployed
      const network = await gateway.getNetwork(channelName);

      // Get the contract from the network.
      const contract = network.getContract(chaincodeName);

      console.log("\n--> Evaluate Transaction: GetAllData");
      let result = await contract.evaluateTransaction("GetAllData");
      console.log(`*** Result: ${result.toString()}`);

      console.log("\n--> Evaluate Transaction: PushData");

      for (let i = 0; i < totalTry; i++) {
        console.log(`\n--> Submit Transaction: PushData ${i}`);

        try {
          const tx = contract.createTransaction("PushData");

          const result = await tx.submit(
            uuidv4(),
            uuidv4(),
            "19980803",
            "Test Data",
            "ECG",
            uuidv4()
          );

          console.log(`\n--> Transaction Result: ${result.toString()}`);
          console.log(`\n--> Submit Transaction: PushData ${i} success`);
          success++;
        } catch (error) {
          console.log(error);
          console.log(`\n--> Submit Transaction: PushData ${i} failed`);
          fail++;
        }
      }

      console.log(`\n--> Total Try: ${totalTry}`);
      console.log(`\n--> Success: ${success}`);
      console.log(`\n--> Fail: ${fail}`);
      console.log(`\n--> Success Rate: ${success / totalTry}`);
    } finally {
      // Disconnect from the gateway when the application is closing
      // This will close all connections to the network
      gateway.disconnect();
    }
  } catch (error) {
    console.error(`******** FAILED to run the application: ${error}`);
  }
}

main();
