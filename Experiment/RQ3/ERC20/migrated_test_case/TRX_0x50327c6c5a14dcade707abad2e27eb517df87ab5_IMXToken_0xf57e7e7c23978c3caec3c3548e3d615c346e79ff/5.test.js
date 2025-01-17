const { expect } = require("chai");
require("@nomiclabs/hardhat-ethers");
const { ethers } = require('hardhat');
const { Contract } = require("ethers");
const { mine } = require('@nomicfoundation/hardhat-network-helpers');
require("@nomicfoundation/hardhat-chai-matchers");
const path = require('path');
const fs = require('fs');

function saveTrace(txHash, trace) {
    const traceDir = path.join(__dirname, '..', 'trace');
    if (!fs.existsSync(traceDir)) {
        fs.mkdirSync(traceDir, { recursive: true });
    }
    const filePath = path.join(traceDir, `${txHash}.json`);
    fs.writeFileSync(filePath, JSON.stringify(trace, null, 2));
}


describe("test", function () {
  it("Should execute all transactions", async function () {
    let contractAddress = undefined;
    let results = [];  

    for (const tx of transactions) {
      let txResultEntry = { hash: tx.hash, pass_assertion: false, revert: false, revert_reason: '', failed_assertion: [], checked_assertion: [], assertion_fail_reason: ''};

      
      if (tx.from) {
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [tx.from],
        });
        await ethers.provider.send("hardhat_setBalance", [tx.from, "0x3635C9ADC5DEA000000000000000"]);  
      }
      
      

      const signer = await ethers.getSigner(tx.from);
      let gas = Number(tx.gas)
      if (tx.isError == '0') {
          gas = gas + 10000000
      }
      const transaction = {
          to: contractAddress,
          value: tx.value, 
          gasLimit: 90000000,
          gasPrice: 8000000000,
          data: tx.input
      };          
      console.log("Sending Tx to", contractAddress)
      
        let txResult;
        let txHash;
        let txReceipt;

        try {
            
            txResult =  signer.sendTransaction(transaction);
            txHash = (await txResult).hash
            txReceipt = await (await txResult).wait();  
            if (txReceipt.contractAddress) {
              contractAddress = txReceipt.contractAddress
              console.log("Deployed Contract At", contractAddress)
            }
            
            
            
            
            
              txResultEntry.revert = false;
              console.log("Transaction Succeeded?", txReceipt.status == 1, tx.hash)

        } catch (error) {
            txResultEntry.revert = true;
            txResultEntry.revert_reason = error.message;
            if (error.transactionHash) {
                
                txHash = error.transactionHash;
                
                txReceipt = await ethers.provider.getTransactionReceipt(txHash);
            }
            console.log("Transaction Reverted", error, tx.hash)
        }
        let trace;
        if (txHash) {
          trace = await network.provider.send("debug_traceTransaction", [txHash]);
          
        }
        
        console.log("Executing Tx:", tx.hash)
        if (assertions[tx.hash]) {
          let assertionChain = expect(txResult);
          let contract;
          try{
          for (const assertion of assertions[tx.hash]) {
              txResultEntry.checked_assertion.push(assertion['method'])
              console.log("Checking assertion:", assertion['method'])
              switch (assertion['method']) {
                  case "revertedWithCustomError":
                      contract = new Contract(contractAddress, assertion.args[0]['interface']['fragments'], signer);
                      assertionChain = assertionChain.to.be.revertedWithCustomError(contract, assertion.args[1]);
                      break;
                  case "revertedWithPanic":
                      assertionChain = assertionChain.to.be.revertedWithCustomError(...assertion.args);
                      break;
                  case "reverted":
                      assertionChain = assertionChain.to.be.reverted;
                      break;
                  case "not-reverted":
                      assertionChain = assertionChain.to.not.be.reverted;
                      break;
                  case "equal":
                      expect(trace['returnValue']).to.equal(assertion.args);
                      break;
                  case "changeTokenBalance":
                      contract = new Contract(contractAddress, assertion.args[0]['interface']['fragments'], signer);
                      assertionChain = assertionChain.to.changeTokenBalance(contract, assertion.args[1], assertion.args[2]);
                      break;
                  case "withArgs":
                      assertionChain = assertionChain.withArgs(...assertion.args);
                      break;
                  case "emit":
                    contract = new Contract(contractAddress, assertion.args[0]['interface']['fragments'], signer);
                      assertionChain = assertionChain.to.emit(contract, assertion.args[1]);
                      break;
                  case "not-emit":
                      contract = new Contract(contractAddress, assertion.args[0]['interface']['fragments'], signer);
                      assertionChain = assertionChain.to.not.emit(contract, assertion.args[1]);
                      break;
                  default:
                    console.log("Unhandled Assertion", assertion['method'])
                    break;
                  
                }
            }
          await assertionChain;
          txResultEntry.pass_assertion = true;
          } catch(error) {
              for (const assertion of assertions[tx.hash]) {
                if (assertion['method']=='emit'){
                  assertion['args'].shift()
                }
                txResultEntry.failed_assertion.push(assertion)
              }
              txResultEntry.assertion_fail_reason = error.message;
          }
          results.push(txResultEntry);

          }
    

    }
    let success = true;
    for (const result of results) {
        if (result.pass_assertion){
          continue
        } else{
          success = false;
        }
    }
    let partial_success = results[results.length - 1].pass_assertion;

    let fileName = ''
    if (success) {
    
    fileName = path.basename(__filename, path.extname(__filename)) + ".success" + ".json";
    } else if (partial_success) {
      fileName = path.basename(__filename, path.extname(__filename)) + ".partial_success" +  ".json";
    } else {
      fileName = path.basename(__filename, path.extname(__filename)) + ".fail" + ".json";
    }
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  });
});

const transactions = [
  {
    "blockNumber": "14203496",
    "timeStamp": "1644831032",
    "hash": "0x5c7534147135b27b1c8f075a6ada167333aaf413df13ebce6e33c7ad654512b1",
    "nonce": "185",
    "blockHash": "0x8e15d7d0731f377fe831b9a458fac607a8cd978df1941556252898ac57cfb1d0",
    "transactionIndex": "79",
    "from": "0xd6d24c5c89001c02826127957d05535ffabe5c2c",
    "to": "",
    "value": "0",
    "gas": "1817014",
    "gasPrice": "30403235008",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x60a06040523480156200001157600080fd5b50604051620014193803806200141983398101604081905262000034916200027c565b604080518082018252600b81526a092dadaeae8c2c4d8ca40b60ab1b602080830191825283518085019094526003808552620929ab60eb1b9185019190915282516b06765c793fa10079d00000009492620000909291620001d6565b508051620000a6906004906020840190620001d6565b50505060008111620000d55760405162461bcd60e51b8152600401620000cc90620002ac565b60405180910390fd5b608052620001047f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6826200010b565b5062000320565b6200011782826200011b565b5050565b620001278282620001a7565b620001175760008281526005602090815260408083206001600160a01b03851684529091529020805460ff1916600117905562000163620001d2565b6001600160a01b0316816001600160a01b0316837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45050565b60009182526005602090815260408084206001600160a01b0393909316845291905290205460ff1690565b3390565b828054620001e490620002e3565b90600052602060002090601f01602090048101928262000208576000855562000253565b82601f106200022357805160ff191683800117855562000253565b8280016001018555821562000253579182015b828111156200025357825182559160200191906001019062000236565b506200026192915062000265565b5090565b5b8082111562000261576000815560010162000266565b6000602082840312156200028e578081fd5b81516001600160a01b0381168114620002a5578182fd5b9392505050565b60208082526015908201527f45524332304361707065643a2063617020697320300000000000000000000000604082015260600190565b600281046001821680620002f857607f821691505b602082108114156200031a57634e487b7160e01b600052602260045260246000fd5b50919050565b6080516110dd6200033c600039600061049901526110dd6000f3fe608060405234801561001057600080fd5b50600436106101375760003560e01c806339509351116100b8578063a217fddf1161007c578063a217fddf14610261578063a457c2d714610269578063a9059cbb1461027c578063d53913931461028f578063d547741f14610297578063dd62ed3e146102aa57610137565b8063395093511461020d57806340c10f191461022057806370a082311461023357806391d148541461024657806395d89b411461025957610137565b8063248a9ca3116100ff578063248a9ca3146101b55780632f2ff15d146101c8578063313ce567146101dd578063355274ea146101f257806336568abe146101fa57610137565b806301ffc9a71461013c57806306fdde0314610165578063095ea7b31461017a57806318160ddd1461018d57806323b872dd146101a2575b600080fd5b61014f61014a366004610c4d565b6102bd565b60405161015c9190610c75565b60405180910390f35b61016d6102ea565b60405161015c9190610c89565b61014f610188366004610bea565b61037c565b610195610399565b60405161015c9190610c80565b61014f6101b0366004610baf565b61039f565b6101956101c3366004610c13565b61043f565b6101db6101d6366004610c2b565b610454565b005b6101e5610492565b60405161015c9190611019565b610195610497565b6101db610208366004610c2b565b6104bb565b61014f61021b366004610bea565b6104fd565b6101db61022e366004610bea565b61054c565b610195610241366004610b5c565b6105d8565b61014f610254366004610c2b565b6105f3565b61016d61061e565b61019561062d565b61014f610277366004610bea565b610632565b61014f61028a366004610bea565b6106ad565b6101956106c1565b6101db6102a5366004610c2b565b6106e5565b6101956102b8366004610b7d565b61070d565b60006001600160e01b03198216637965db0b60e01b14806102e257506102e282610738565b90505b919050565b6060600380546102f990611056565b80601f016020809104026020016040519081016040528092919081815260200182805461032590611056565b80156103725780601f1061034757610100808354040283529160200191610372565b820191906000526020600020905b81548152906001019060200180831161035557829003601f168201915b5050505050905090565b6000610390610389610751565b8484610755565b50600192915050565b60025490565b60006103ac848484610809565b6001600160a01b0384166000908152600160205260408120816103cd610751565b6001600160a01b03166001600160a01b03168152602001908152602001600020549050828110156104195760405162461bcd60e51b815260040161041090610e46565b60405180910390fd5b61043485610425610751565b61042f868561103f565b610755565b506001949350505050565b60009081526005602052604090206001015490565b6104686104608361043f565b610254610751565b6104845760405162461bcd60e51b815260040161041090610d1f565b61048e8282610931565b5050565b601290565b7f000000000000000000000000000000000000000000000000000000000000000090565b6104c3610751565b6001600160a01b0316816001600160a01b0316146104f35760405162461bcd60e51b815260040161041090610f93565b61048e82826109b8565b600061039061050a610751565b848460016000610518610751565b6001600160a01b03908116825260208083019390935260409182016000908120918b168152925290205461042f9190611027565b7f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6336040518060400160405280601681526020017521b0b63632b91034b9903737ba10309036b4b73a32b960511b8152506105a783836105f3565b81906105c65760405162461bcd60e51b81526004016104109190610c89565b506105d18585610a3d565b5050505050565b6001600160a01b031660009081526020819052604090205490565b60009182526005602090815260408084206001600160a01b0393909316845291905290205460ff1690565b6060600480546102f990611056565b600081565b60008060016000610641610751565b6001600160a01b039081168252602080830193909352604091820160009081209188168152925290205490508281101561068d5760405162461bcd60e51b815260040161041090610f4e565b6106a3610698610751565b8561042f868561103f565b5060019392505050565b60006103906106ba610751565b8484610809565b7f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a681565b6106f16104608361043f565b6104f35760405162461bcd60e51b815260040161041090610df6565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6001600160e01b031981166301ffc9a760e01b14919050565b3390565b6001600160a01b03831661077b5760405162461bcd60e51b815260040161041090610f0a565b6001600160a01b0382166107a15760405162461bcd60e51b815260040161041090610d6e565b6001600160a01b0380841660008181526001602090815260408083209487168084529490915290819020849055517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906107fc908590610c80565b60405180910390a3505050565b6001600160a01b03831661082f5760405162461bcd60e51b815260040161041090610e8e565b6001600160a01b0382166108555760405162461bcd60e51b815260040161041090610cdc565b610860838383610a80565b6001600160a01b038316600090815260208190526040902054818110156108995760405162461bcd60e51b815260040161041090610db0565b6108a3828261103f565b6001600160a01b0380861660009081526020819052604080822093909355908516815290812080548492906108d9908490611027565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516109239190610c80565b60405180910390a350505050565b61093b82826105f3565b61048e5760008281526005602090815260408083206001600160a01b03851684529091529020805460ff19166001179055610974610751565b6001600160a01b0316816001600160a01b0316837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45050565b6109c282826105f3565b1561048e5760008281526005602090815260408083206001600160a01b03851684529091529020805460ff191690556109f9610751565b6001600160a01b0316816001600160a01b0316837ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a45050565b610a45610497565b81610a4e610399565b610a589190611027565b1115610a765760405162461bcd60e51b815260040161041090610ed3565b61048e8282610a85565b505050565b6001600160a01b038216610aab5760405162461bcd60e51b815260040161041090610fe2565b610ab760008383610a80565b8060026000828254610ac99190611027565b90915550506001600160a01b03821660009081526020819052604081208054839290610af6908490611027565b90915550506040516001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90610b39908590610c80565b60405180910390a35050565b80356001600160a01b03811681146102e557600080fd5b600060208284031215610b6d578081fd5b610b7682610b45565b9392505050565b60008060408385031215610b8f578081fd5b610b9883610b45565b9150610ba660208401610b45565b90509250929050565b600080600060608486031215610bc3578081fd5b610bcc84610b45565b9250610bda60208501610b45565b9150604084013590509250925092565b60008060408385031215610bfc578182fd5b610c0583610b45565b946020939093013593505050565b600060208284031215610c24578081fd5b5035919050565b60008060408385031215610c3d578182fd5b82359150610ba660208401610b45565b600060208284031215610c5e578081fd5b81356001600160e01b031981168114610b76578182fd5b901515815260200190565b90815260200190565b6000602080835283518082850152825b81811015610cb557858101830151858201604001528201610c99565b81811115610cc65783604083870101525b50601f01601f1916929092016040019392505050565b60208082526023908201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260408201526265737360e81b606082015260800190565b6020808252602f908201527f416363657373436f6e74726f6c3a2073656e646572206d75737420626520616e60408201526e0818591b5a5b881d1bc819dc985b9d608a1b606082015260800190565b60208082526022908201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604082015261737360f01b606082015260800190565b60208082526026908201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604082015265616c616e636560d01b606082015260800190565b60208082526030908201527f416363657373436f6e74726f6c3a2073656e646572206d75737420626520616e60408201526f2061646d696e20746f207265766f6b6560801b606082015260800190565b60208082526028908201527f45524332303a207472616e7366657220616d6f756e74206578636565647320616040820152676c6c6f77616e636560c01b606082015260800190565b60208082526025908201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604082015264647265737360d81b606082015260800190565b60208082526019908201527f45524332304361707065643a2063617020657863656564656400000000000000604082015260600190565b60208082526024908201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646040820152637265737360e01b606082015260800190565b60208082526025908201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604082015264207a65726f60d81b606082015260800190565b6020808252602f908201527f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636560408201526e103937b632b9903337b91039b2b63360891b606082015260800190565b6020808252601f908201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604082015260600190565b60ff91909116815260200190565b6000821982111561103a5761103a611091565b500190565b60008282101561105157611051611091565b500390565b60028104600182168061106a57607f821691505b6020821081141561108b57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fdfea2646970667358221220d1aee677c8c40e22964fd609de63af649f5deda742792e1944c8e22d6b21975164736f6c63430008000033000000000000000000000000d6d24c5c89001c02826127957d05535ffabe5c2c",
    "contractAddress": "0x50327c6c5a14dcade707abad2e27eb517df87ab5",
    "cumulativeGasUsed": "10514743",
    "gasUsed": "1817014",
    "confirmations": "5609119",
    "methodId": "0x60806040",
    "functionName": "atInversebrah(int248 a, uint48[] b, uint32 c, bytes20[] d, bytes30[] e)",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "14531129",
    "timeStamp": "1649231697",
    "hash": "0x4e06b49d4c9be5df6df4028467a47547e2ad026a83100eba7733377df38a054e",
    "nonce": "6",
    "blockHash": "0xf42a0330ce7e30d2127c5584c94061738f3ad7ab5a01a671479be9a87d839a5e",
    "transactionIndex": "44",
    "from": "0x4db7719251ce8ba74549ba35bbdc02418ecde595",
    "to": "0x50327c6c5a14dcade707abad2e27eb517df87ab5",
    "value": "0",
    "gas": "46572",
    "gasPrice": "44532284478",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x095ea7b30000000000000000000000009277a463a508f45115fdeaf22ffeda1b16352433ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "contractAddress": "",
    "cumulativeGasUsed": "3063067",
    "gasUsed": "46572",
    "confirmations": "5281486",
    "methodId": "0x095ea7b3",
    "functionName": "approve(address _spender, uint256 _value)",
    "trace_address": [
      -1
    ]
  }
]
const assertions = {
  "0x4e06b49d4c9be5df6df4028467a47547e2ad026a83100eba7733377df38a054e": [
    {
      "method": "emit",
      "args": [
        {
          "interface": {
            "fragments": [
              {
                "inputs": [
                  {
                    "internalType": "string",
                    "name": "name_",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "symbol_",
                    "type": "string"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "constructor"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                  },
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                  }
                ],
                "name": "Approval",
                "type": "event"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": false,
                    "internalType": "address",
                    "name": "userAddress",
                    "type": "address"
                  },
                  {
                    "indexed": false,
                    "internalType": "address payable",
                    "name": "relayerAddress",
                    "type": "address"
                  },
                  {
                    "indexed": false,
                    "internalType": "bytes",
                    "name": "functionSignature",
                    "type": "bytes"
                  }
                ],
                "name": "MetaTransactionExecuted",
                "type": "event"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "previousAdminRole",
                    "type": "bytes32"
                  },
                  {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "newAdminRole",
                    "type": "bytes32"
                  }
                ],
                "name": "RoleAdminChanged",
                "type": "event"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  },
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                  }
                ],
                "name": "RoleGranted",
                "type": "event"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  },
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                  }
                ],
                "name": "RoleRevoked",
                "type": "event"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "from",
                    "type": "address"
                  },
                  {
                    "indexed": true,
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                  },
                  {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                  }
                ],
                "name": "Transfer",
                "type": "event"
              },
              {
                "inputs": [],
                "name": "DEFAULT_ADMIN_ROLE",
                "outputs": [
                  {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "ERC712_VERSION",
                "outputs": [
                  {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "PREDICATE_ROLE",
                "outputs": [
                  {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                  }
                ],
                "name": "allowance",
                "outputs": [
                  {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "approve",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  }
                ],
                "name": "balanceOf",
                "outputs": [
                  {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "decimals",
                "outputs": [
                  {
                    "internalType": "uint8",
                    "name": "",
                    "type": "uint8"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "subtractedValue",
                    "type": "uint256"
                  }
                ],
                "name": "decreaseAllowance",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "userAddress",
                    "type": "address"
                  },
                  {
                    "internalType": "bytes",
                    "name": "functionSignature",
                    "type": "bytes"
                  },
                  {
                    "internalType": "bytes32",
                    "name": "sigR",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "bytes32",
                    "name": "sigS",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "uint8",
                    "name": "sigV",
                    "type": "uint8"
                  }
                ],
                "name": "executeMetaTransaction",
                "outputs": [
                  {
                    "internalType": "bytes",
                    "name": "",
                    "type": "bytes"
                  }
                ],
                "stateMutability": "payable",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "getChainId",
                "outputs": [
                  {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "stateMutability": "pure",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "getDomainSeperator",
                "outputs": [
                  {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                  }
                ],
                "name": "getNonce",
                "outputs": [
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  }
                ],
                "name": "getRoleAdmin",
                "outputs": [
                  {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                  }
                ],
                "name": "getRoleMember",
                "outputs": [
                  {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  }
                ],
                "name": "getRoleMemberCount",
                "outputs": [
                  {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  }
                ],
                "name": "grantRole",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  }
                ],
                "name": "hasRole",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "addedValue",
                    "type": "uint256"
                  }
                ],
                "name": "increaseAllowance",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "user",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "mint",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "name",
                "outputs": [
                  {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  }
                ],
                "name": "renounceRole",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "bytes32",
                    "name": "role",
                    "type": "bytes32"
                  },
                  {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                  }
                ],
                "name": "revokeRole",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "symbol",
                "outputs": [
                  {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [],
                "name": "totalSupply",
                "outputs": [
                  {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "recipient",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "transfer",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "recipient",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "transferFrom",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ]
          }
        },
        "Approval"
      ]
    },
    {
      "method": "withArgs",
      "args": [
        "0x4db7719251ce8bA74549BA35bbDc02418eCdE595",
        "0x9277a463A508F45115FdEaf22FfeDA1B16352433",
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      ]
    },
    {
      "method": "equal",
      "args": "0000000000000000000000000000000000000000000000000000000000000001"
    }
  ],
  "0x5c7534147135b27b1c8f075a6ada167333aaf413df13ebce6e33c7ad654512b1": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ]
}
