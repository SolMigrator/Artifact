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
    "blockNumber": "10569013",
    "timeStamp": "1596220363",
    "hash": "0x0a4022e61c49c59b2538b78a6c7c9a0e4bb8c8fce2d1b4a725baef3c55fb7363",
    "nonce": "83",
    "blockHash": "0x678dc99c448fc2dbc10081160066b5f654c916340c79c3b239fe4aaad200dca9",
    "transactionIndex": "144",
    "from": "0xb8f226ddb7bc672e27dffb67e4adabfa8c0dfa08",
    "to": "",
    "value": "0",
    "gas": "4712388",
    "gasPrice": "49000000000",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x60806040523480156200001157600080fd5b506040516200174038038062001740833981016040819052620000349162000454565b604051806040016040528060048152602001635065706560e01b815250604051806040016040528060048152602001635045504560e01b8152506200008862000082620000cf60201b60201c565b620000d3565b81516200009d906004906020850190620003ae565b508051620000b3906005906020840190620003ae565b505050620000c833826200012360201b60201c565b506200058b565b3390565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6001600160a01b038216620001555760405162461bcd60e51b81526004016200014c90620004c4565b60405180910390fd5b620001636000838362000205565b806003600082825462000177919062000529565b90915550506001600160a01b03821660009081526001602052604081208054839290620001a690849062000529565b90915550506040516001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90620001eb90859062000520565b60405180910390a362000201600083836200037f565b5050565b6001600160a01b0382166000908152600a602052604090205460ff161580156200024857506001600160a01b0383166000908152600a602052604090205460ff16155b620002675760405162461bcd60e51b81526004016200014c90620004fb565b6009546001600160a01b0316620002e1576200028262000384565b6001600160a01b0316836001600160a01b03161480620002bc5750620002a762000384565b6001600160a01b0316826001600160a01b0316145b620002db5760405162461bcd60e51b81526004016200014c906200048d565b6200037f565b60065460ff1680156200030157506009546001600160a01b038481169116145b156200037f576007548162000321846200039360201b620005891760201c565b6200032d919062000529565b111580156200036057506008548162000351846200039360201b620005891760201c565b6200035d919062000529565b10155b6200037f5760405162461bcd60e51b81526004016200014c906200046d565b505050565b6000546001600160a01b031690565b6001600160a01b031660009081526001602052604090205490565b828054620003bc906200054e565b90600052602060002090601f016020900481019282620003e057600085556200042b565b82601f10620003fb57805160ff19168380011785556200042b565b828001600101855582156200042b579182015b828111156200042b5782518255916020019190600101906200040e565b50620004399291506200043d565b5090565b5b808211156200043957600081556001016200043e565b60006020828403121562000466578081fd5b5051919050565b602080825260069082015265119bdc989a5960d21b604082015260600190565b60208082526016908201527f74726164696e67206973206e6f74207374617274656400000000000000000000604082015260600190565b6020808252601f908201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604082015260600190565b6020808252600b908201526a109b1858dadb1a5cdd195960aa1b604082015260600190565b90815260200190565b600082198211156200054957634e487b7160e01b81526011600452602481fd5b500190565b6002810460018216806200056357607f821691505b602082108114156200058557634e487b7160e01b600052602260045260246000fd5b50919050565b6111a5806200059b6000396000f3fe608060405234801561001057600080fd5b50600436106101425760003560e01c806349bd5a5e116100b85780638da5cb5b1161007c5780638da5cb5b1461026b57806395d89b4114610273578063a457c2d71461027b578063a9059cbb1461028e578063dd62ed3e146102a1578063f2fde38b146102b457610142565b806349bd5a5e1461022b57806370a0823114610240578063715018a614610253578063860a32ec1461025b57806389f9a1d31461026357610142565b806323b872dd1161010a57806323b872dd146101b5578063313ce567146101c857806339509351146101dd5780633aa633aa146101f0578063404e51291461020557806342966c681461021857610142565b806306fdde0314610147578063095ea7b31461016557806316c021291461018557806318160ddd146101985780631ab99e12146101ad575b600080fd5b61014f6102c7565b60405161015c9190610d31565b60405180910390f35b610178610173366004610c90565b610359565b60405161015c9190610d26565b610178610193366004610bd9565b610376565b6101a061038b565b60405161015c91906110d8565b6101a0610391565b6101786101c3366004610c2c565b610397565b6101d0610430565b60405161015c91906110e1565b6101786101eb366004610c90565b610435565b6102036101fe366004610cb9565b610489565b005b610203610213366004610c67565b610503565b610203610226366004610cfa565b61056d565b61023361057a565b60405161015c9190610d12565b6101a061024e366004610bd9565b610589565b6102036105a8565b6101786105f3565b6101a06105fc565b610233610602565b61014f610611565b610178610289366004610c90565b610620565b61017861029c366004610c90565b610699565b6101a06102af366004610bfa565b6106ad565b6102036102c2366004610bd9565b6106d8565b6060600480546102d69061111e565b80601f01602080910402602001604051908101604052809291908181526020018280546103029061111e565b801561034f5780601f106103245761010080835404028352916020019161034f565b820191906000526020600020905b81548152906001019060200180831161033257829003601f168201915b5050505050905090565b600061036d610366610746565b848461074a565b50600192915050565b600a6020526000908152604090205460ff1681565b60035490565b60085481565b60006103a48484846107fe565b6001600160a01b0384166000908152600260205260408120816103c5610746565b6001600160a01b03166001600160a01b03168152602001908152602001600020549050828110156104115760405162461bcd60e51b815260040161040890610ef7565b60405180910390fd5b6104258561041d610746565b85840361074a565b506001949350505050565b601290565b600061036d610442610746565b848460026000610450610746565b6001600160a01b03908116825260208083019390935260409182016000908120918b168152925290205461048491906110ef565b61074a565b610491610746565b6001600160a01b03166104a2610602565b6001600160a01b0316146104c85760405162461bcd60e51b815260040161040890610f3f565b6006805460ff191694151594909417909355600980546001600160a01b0319166001600160a01b039390931692909217909155600755600855565b61050b610746565b6001600160a01b031661051c610602565b6001600160a01b0316146105425760405162461bcd60e51b815260040161040890610f3f565b6001600160a01b03919091166000908152600a60205260409020805460ff1916911515919091179055565b6105773382610928565b50565b6009546001600160a01b031681565b6001600160a01b0381166000908152600160205260409020545b919050565b6105b0610746565b6001600160a01b03166105c1610602565b6001600160a01b0316146105e75760405162461bcd60e51b815260040161040890610f3f565b6105f16000610a1a565b565b60065460ff1681565b60075481565b6000546001600160a01b031690565b6060600580546102d69061111e565b6000806002600061062f610746565b6001600160a01b039081168252602080830193909352604091820160009081209188168152925290205490508281101561067b5760405162461bcd60e51b81526004016104089061106e565b61068f610686610746565b8585840361074a565b5060019392505050565b600061036d6106a6610746565b84846107fe565b6001600160a01b03918216600090815260026020908152604080832093909416825291909152205490565b6106e0610746565b6001600160a01b03166106f1610602565b6001600160a01b0316146107175760405162461bcd60e51b815260040161040890610f3f565b6001600160a01b03811661073d5760405162461bcd60e51b815260040161040890610e09565b61057781610a1a565b3390565b6001600160a01b0383166107705760405162461bcd60e51b81526004016104089061102a565b6001600160a01b0382166107965760405162461bcd60e51b815260040161040890610e4f565b6001600160a01b0380841660008181526002602090815260408083209487168084529490915290819020849055517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906107f19085906110d8565b60405180910390a3505050565b6001600160a01b0383166108245760405162461bcd60e51b815260040161040890610fe5565b6001600160a01b03821661084a5760405162461bcd60e51b815260040161040890610d84565b610855838383610a6a565b6001600160a01b0383166000908152600160205260409020548181101561088e5760405162461bcd60e51b815260040161040890610e91565b6001600160a01b038085166000908152600160205260408082208585039055918516815290812080548492906108c59084906110ef565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161090f91906110d8565b60405180910390a3610922848484610a15565b50505050565b6001600160a01b03821661094e5760405162461bcd60e51b815260040161040890610f74565b61095a82600083610a6a565b6001600160a01b038216600090815260016020526040902054818110156109935760405162461bcd60e51b815260040161040890610dc7565b6001600160a01b03831660009081526001602052604081208383039055600380548492906109c2908490611107565b90915550506040516000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90610a059086906110d8565b60405180910390a3610a15836000845b505050565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6001600160a01b0382166000908152600a602052604090205460ff16158015610aac57506001600160a01b0383166000908152600a602052604090205460ff16155b610ac85760405162461bcd60e51b8152600401610408906110b3565b6009546001600160a01b0316610b3857610ae0610602565b6001600160a01b0316836001600160a01b03161480610b175750610b02610602565b6001600160a01b0316826001600160a01b0316145b610b335760405162461bcd60e51b815260040161040890610fb5565b610a15565b60065460ff168015610b5757506009546001600160a01b038481169116145b15610a155760075481610b6984610589565b610b7391906110ef565b11158015610b96575060085481610b8984610589565b610b9391906110ef565b10155b610a155760405162461bcd60e51b815260040161040890610ed7565b80356001600160a01b03811681146105a357600080fd5b803580151581146105a357600080fd5b600060208284031215610bea578081fd5b610bf382610bb2565b9392505050565b60008060408385031215610c0c578081fd5b610c1583610bb2565b9150610c2360208401610bb2565b90509250929050565b600080600060608486031215610c40578081fd5b610c4984610bb2565b9250610c5760208501610bb2565b9150604084013590509250925092565b60008060408385031215610c79578182fd5b610c8283610bb2565b9150610c2360208401610bc9565b60008060408385031215610ca2578182fd5b610cab83610bb2565b946020939093013593505050565b60008060008060808587031215610cce578081fd5b610cd785610bc9565b9350610ce560208601610bb2565b93969395505050506040820135916060013590565b600060208284031215610d0b578081fd5b5035919050565b6001600160a01b0391909116815260200190565b901515815260200190565b6000602080835283518082850152825b81811015610d5d57858101830151858201604001528201610d41565b81811115610d6e5783604083870101525b50601f01601f1916929092016040019392505050565b60208082526023908201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260408201526265737360e81b606082015260800190565b60208082526022908201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604082015261636560f01b606082015260800190565b60208082526026908201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160408201526564647265737360d01b606082015260800190565b60208082526022908201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604082015261737360f01b606082015260800190565b60208082526026908201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604082015265616c616e636560d01b606082015260800190565b602080825260069082015265119bdc989a5960d21b604082015260600190565b60208082526028908201527f45524332303a207472616e7366657220616d6f756e74206578636565647320616040820152676c6c6f77616e636560c01b606082015260800190565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b60208082526021908201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736040820152607360f81b606082015260800190565b6020808252601690820152751d1c98591a5b99c81a5cc81b9bdd081cdd185c9d195960521b604082015260600190565b60208082526025908201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604082015264647265737360d81b606082015260800190565b60208082526024908201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646040820152637265737360e01b606082015260800190565b60208082526025908201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604082015264207a65726f60d81b606082015260800190565b6020808252600b908201526a109b1858dadb1a5cdd195960aa1b604082015260600190565b90815260200190565b60ff91909116815260200190565b6000821982111561110257611102611159565b500190565b60008282101561111957611119611159565b500390565b60028104600182168061113257607f821691505b6020821081141561115357634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fdfea2646970667358221220e905ad1a7e419ed6c4450c15a3249a7a816cdd698384f84c43e47d9cc66a804364736f6c63430008000033000000000000000000000000000000000000314dc6448d9338c15b0a00000000",
    "contractAddress": "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
    "cumulativeGasUsed": "8701105",
    "gasUsed": "1231579",
    "confirmations": "9243569",
    "methodId": "0x60806040",
    "functionName": "atInversebrah(int248 a, uint48[] b, uint32 c, bytes20[] d, bytes30[] e)",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "10569168",
    "timeStamp": "1596222856",
    "hash": "0x8bbc79a042b75f50a819a30190c3f3b32a5ad5fda0988c3a6d8fe78a3a4ca329",
    "nonce": "84",
    "blockHash": "0xf27b7a80ad326207fbf118d00076e1ea0bd640cbe042c249684608c8b3c6dd21",
    "transactionIndex": "103",
    "from": "0xb8f226ddb7bc672e27dffb67e4adabfa8c0dfa08",
    "to": "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
    "value": "0",
    "gas": "77110",
    "gasPrice": "55000000000",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0xa9059cbb000000000000000000000000ab5801a7d398351b8be11c439e05c5b3259aec9b000000000000000000000000000000000000007e37be2022c0914b2680000000",
    "contractAddress": "",
    "cumulativeGasUsed": "10626608",
    "gasUsed": "51407",
    "confirmations": "9243414",
    "methodId": "0xa9059cbb",
    "functionName": "transfer(address _to, uint256 _value)",
    "trace_address": [
      -1
    ]
  }
]
const assertions = {
  "0x0a4022e61c49c59b2538b78a6c7c9a0e4bb8c8fce2d1b4a725baef3c55fb7363": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ],
  "0x8bbc79a042b75f50a819a30190c3f3b32a5ad5fda0988c3a6d8fe78a3a4ca329": [
    {
      "method": "emit",
      "args": [
        {
          "interface": {
            "fragments": [
              {
                "constant": true,
                "inputs": [],
                "name": "name",
                "outputs": [
                  {
                    "name": "",
                    "type": "string"
                  }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
              },
              {
                "constant": false,
                "inputs": [
                  {
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "name": "value",
                    "type": "uint256"
                  }
                ],
                "name": "approve",
                "outputs": [
                  {
                    "name": "",
                    "type": "bool"
                  }
                ],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "constant": true,
                "inputs": [],
                "name": "totalSupply",
                "outputs": [
                  {
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
              },
              {
                "constant": false,
                "inputs": [
                  {
                    "name": "sender",
                    "type": "address"
                  },
                  {
                    "name": "recipient",
                    "type": "address"
                  },
                  {
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "transferFrom",
                "outputs": [
                  {
                    "name": "",
                    "type": "bool"
                  }
                ],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [
                  {
                    "name": "",
                    "type": "uint8"
                  }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
              },
              {
                "constant": false,
                "inputs": [
                  {
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "name": "addedValue",
                    "type": "uint256"
                  }
                ],
                "name": "increaseAllowance",
                "outputs": [
                  {
                    "name": "",
                    "type": "bool"
                  }
                ],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "constant": false,
                "inputs": [
                  {
                    "name": "value",
                    "type": "uint256"
                  }
                ],
                "name": "burn",
                "outputs": [],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "constant": true,
                "inputs": [
                  {
                    "name": "account",
                    "type": "address"
                  }
                ],
                "name": "balanceOf",
                "outputs": [
                  {
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
              },
              {
                "constant": true,
                "inputs": [],
                "name": "symbol",
                "outputs": [
                  {
                    "name": "",
                    "type": "string"
                  }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
              },
              {
                "constant": false,
                "inputs": [
                  {
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "name": "subtractedValue",
                    "type": "uint256"
                  }
                ],
                "name": "decreaseAllowance",
                "outputs": [
                  {
                    "name": "",
                    "type": "bool"
                  }
                ],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "constant": false,
                "inputs": [
                  {
                    "name": "recipient",
                    "type": "address"
                  },
                  {
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "transfer",
                "outputs": [
                  {
                    "name": "",
                    "type": "bool"
                  }
                ],
                "payable": false,
                "stateMutability": "nonpayable",
                "type": "function"
              },
              {
                "constant": true,
                "inputs": [
                  {
                    "name": "owner",
                    "type": "address"
                  },
                  {
                    "name": "spender",
                    "type": "address"
                  }
                ],
                "name": "allowance",
                "outputs": [
                  {
                    "name": "",
                    "type": "uint256"
                  }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
              },
              {
                "inputs": [
                  {
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "name": "symbol",
                    "type": "string"
                  },
                  {
                    "name": "decimals",
                    "type": "uint8"
                  },
                  {
                    "name": "totalSupply",
                    "type": "uint256"
                  },
                  {
                    "name": "feeReceiver",
                    "type": "address"
                  },
                  {
                    "name": "tokenOwnerAddress",
                    "type": "address"
                  }
                ],
                "payable": true,
                "stateMutability": "payable",
                "type": "constructor"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "name": "from",
                    "type": "address"
                  },
                  {
                    "indexed": true,
                    "name": "to",
                    "type": "address"
                  },
                  {
                    "indexed": false,
                    "name": "value",
                    "type": "uint256"
                  }
                ],
                "name": "Transfer",
                "type": "event"
              },
              {
                "anonymous": false,
                "inputs": [
                  {
                    "indexed": true,
                    "name": "owner",
                    "type": "address"
                  },
                  {
                    "indexed": true,
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "indexed": false,
                    "name": "value",
                    "type": "uint256"
                  }
                ],
                "name": "Approval",
                "type": "event"
              }
            ]
          }
        },
        "Transfer"
      ]
    },
    {
      "method": "withArgs",
      "args": [
        "0xB8f226dDb7bC672E27dffB67e4adAbFa8c0dFA08",
        "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
        "0x7e37be2022c0914b2680000000"
      ]
    },
    {
      "method": "equal",
      "args": "0000000000000000000000000000000000000000000000000000000000000001"
    }
  ]
}
