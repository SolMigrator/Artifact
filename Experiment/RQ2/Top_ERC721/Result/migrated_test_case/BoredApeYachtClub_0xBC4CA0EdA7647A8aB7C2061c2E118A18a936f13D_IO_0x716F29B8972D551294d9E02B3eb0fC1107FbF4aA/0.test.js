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
    "blockNumber": "12287507",
    "timeStamp": "1619060596",
    "hash": "0x22199329b0aa1aa68902a78e3b32ca327c872fab166c7a2838273de6ad383eba",
    "nonce": "4",
    "blockHash": "0x5b605ffe97e58c657dd3888c014a47fff085f356aeda27de46594b711da29e18",
    "transactionIndex": "155",
    "from": "0xaba7161a7fb69c88e16ed9f455ce62b791ee4d03",
    "to": "",
    "value": "0",
    "gas": "3893600",
    "gasPrice": "110000001459",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x60806040526702c68af0bb140000600e556714d1120d7b1600006016553480156200002957600080fd5b506040516200303d3803806200303d8339810160408190526200004c9162000258565b81518290829062000065906000906020850190620000fb565b5080516200007b906001906020840190620000fb565b5050506200009862000092620000a560201b60201c565b620000a9565b5050600160075562000315565b3390565b600680546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b8280546200010990620002c2565b90600052602060002090601f0160209004810192826200012d576000855562000178565b82601f106200014857805160ff191683800117855562000178565b8280016001018555821562000178579182015b82811115620001785782518255916020019190600101906200015b565b50620001869291506200018a565b5090565b5b808211156200018657600081556001016200018b565b600082601f830112620001b357600080fd5b81516001600160401b0380821115620001d057620001d0620002ff565b604051601f8301601f19908116603f01168101908282118183101715620001fb57620001fb620002ff565b816040528381526020925086838588010111156200021857600080fd5b600091505b838210156200023c57858201830151818301840152908201906200021d565b838211156200024e5760008385830101525b9695505050505050565b600080604083850312156200026c57600080fd5b82516001600160401b03808211156200028457600080fd5b6200029286838701620001a1565b93506020850151915080821115620002a957600080fd5b50620002b885828601620001a1565b9150509250929050565b600181811c90821680620002d757607f821691505b60208210811415620002f957634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b612d1880620003256000396000f3fe60806040526004361061031a5760003560e01c806373a4c307116101ab578063a22cb465116100f7578063df2fc7d211610095578063e985e9c51161006f578063e985e9c5146108bc578063f0188b3e14610905578063f21852d014610921578063f2fde38b1461093b57600080fd5b8063df2fc7d21461085f578063e0cad9b11461087f578063e4b7fb73146108a757600080fd5b8063b88d4fde116100d1578063b88d4fde146107c5578063c87b56dd146107e5578063d3c553ad14610805578063db4bec441461083257600080fd5b8063a22cb46514610779578063a394ee4b14610799578063a82feb32146107af57600080fd5b80638da5cb5b116101645780639363c8121161013e5780639363c8121461073857806394ed3a761461074e57806395d89b411461076457806398ca667f1461062f57600080fd5b80638da5cb5b146106d45780638e0c09b2146106f25780639064d0f11461070857600080fd5b806373a4c3071461062f5780637c51afba146106445780637cb647591461066c5780637d7eee421461068c57806386233071146106ac57806389d2f9dd146106c157600080fd5b806342842e0e1161026a5780636bb7b1d9116102235780636faaf624116101fd5780636faaf624146105ce57806370237718146105e457806370a08231146105fa578063715018a61461061a57600080fd5b80636bb7b1d9146105835780636c0360eb146105995780636d5d40c6146105ae57600080fd5b806342842e0e146104e55780634889b94014610505578063540075b41461051a57806355f804b3146105305780635d1d95b1146105505780636352211e1461056357600080fd5b806318160ddd116102d757806332cb6b0c116102b157806332cb6b0c146104855780633c33eec41461049b5780633ccfd60b146104b0578063403555f7146104c557600080fd5b806318160ddd14610420578063224c6edb1461044557806323b872dd1461046557600080fd5b806301ffc9a71461031f578063046dc1661461035457806306fdde0314610376578063081812fc14610398578063095ea7b3146103d0578063119936f2146103f0575b600080fd5b34801561032b57600080fd5b5061033f61033a3660046128df565b61095b565b60405190151581526020015b60405180910390f35b34801561036057600080fd5b5061037461036f366004612659565b6109ad565b005b34801561038257600080fd5b5061038b610a02565b60405161034b91906129f3565b3480156103a457600080fd5b506103b86103b33660046128c6565b610a94565b6040516001600160a01b03909116815260200161034b565b3480156103dc57600080fd5b506103746103eb3660046127df565b610b29565b3480156103fc57600080fd5b5061033f61040b366004612659565b600c6020526000908152604090205460ff1681565b34801561042c57600080fd5b50600a546104379081565b60405190815260200161034b565b34801561045157600080fd5b506103746104603660046128c6565b610c3f565b34801561047157600080fd5b506103746104803660046126a7565b610d41565b34801561049157600080fd5b506104376122b881565b3480156104a757600080fd5b50610374610d72565b3480156104bc57600080fd5b50610374610db0565b3480156104d157600080fd5b506103746104e0366004612659565b610e87565b3480156104f157600080fd5b506103746105003660046126a7565b610fb6565b34801561051157600080fd5b50610437600181565b34801561052657600080fd5b50610437600b5481565b34801561053c57600080fd5b5061037461054b366004612919565b610fd1565b61037461055e366004612919565b611007565b34801561056f57600080fd5b506103b861057e3660046128c6565b611256565b34801561058f57600080fd5b5061043760155481565b3480156105a557600080fd5b5061038b6112cd565b3480156105ba57600080fd5b506103746105c93660046128c6565b61135b565b3480156105da57600080fd5b5061043760165481565b3480156105f057600080fd5b5061043760115481565b34801561060657600080fd5b50610437610615366004612659565b61138a565b34801561062657600080fd5b50610374611411565b34801561063b57600080fd5b50610437606481565b34801561065057600080fd5b506103b873ff3a0a8b9b38fcfe22e738b4639a6e978bf3b08081565b34801561067857600080fd5b506103746106873660046128c6565b611447565b34801561069857600080fd5b506103746106a73660046128c6565b611476565b3480156106b857600080fd5b5061033f6114a5565b6103746106cf366004612809565b6114bf565b3480156106e057600080fd5b506006546001600160a01b03166103b8565b3480156106fe57600080fd5b5061043761108681565b34801561071457600080fd5b5061071d6116bb565b6040805182518152602092830151928101929092520161034b565b34801561074457600080fd5b50610437600e5481565b34801561075a57600080fd5b50610437600d5481565b34801561077057600080fd5b5061038b61178b565b34801561078557600080fd5b506103746107943660046127a3565b61179a565b3480156107a557600080fd5b5061043761038481565b3480156107bb57600080fd5b5061043760135481565b3480156107d157600080fd5b506103746107e03660046126e3565b6117a9565b3480156107f157600080fd5b5061038b6108003660046128c6565b6117e1565b34801561081157600080fd5b50610437610820366004612659565b60146020526000908152604090205481565b34801561083e57600080fd5b5061043761084d366004612659565b600f6020526000908152604090205481565b34801561086b57600080fd5b5061037461087a3660046128c6565b6118bc565b34801561088b57600080fd5b506103b87384eb8d02819bd90c766d23370c8926d857ce150581565b3480156108b357600080fd5b506104376118eb565b3480156108c857600080fd5b5061033f6108d7366004612674565b6001600160a01b03918216600090815260056020908152604080832093909416825291909152205460ff1690565b34801561091157600080fd5b5061043767016345785d8a000081565b34801561092d57600080fd5b5060125461033f9060ff1681565b34801561094757600080fd5b50610374610956366004612659565b6118ff565b60006001600160e01b031982166380ac58cd60e01b148061098c57506001600160e01b03198216635b5e139f60e01b145b806109a757506301ffc9a760e01b6001600160e01b03198316145b92915050565b6006546001600160a01b031633146109e05760405162461bcd60e51b81526004016109d790612a58565b60405180910390fd5b600880546001600160a01b0319166001600160a01b0392909216919091179055565b606060008054610a1190612bd4565b80601f0160208091040260200160405190810160405280929190818152602001828054610a3d90612bd4565b8015610a8a5780601f10610a5f57610100808354040283529160200191610a8a565b820191906000526020600020905b815481529060010190602001808311610a6d57829003601f168201915b5050505050905090565b6000818152600260205260408120546001600160a01b0316610b0d5760405162461bcd60e51b815260206004820152602c60248201527f4552433732313a20617070726f76656420717565727920666f72206e6f6e657860448201526b34b9ba32b73a103a37b5b2b760a11b60648201526084016109d7565b506000908152600460205260409020546001600160a01b031690565b6000610b3482611256565b9050806001600160a01b0316836001600160a01b03161415610ba25760405162461bcd60e51b815260206004820152602160248201527f4552433732313a20617070726f76616c20746f2063757272656e74206f776e656044820152603960f91b60648201526084016109d7565b336001600160a01b0382161480610bbe5750610bbe81336108d7565b610c305760405162461bcd60e51b815260206004820152603860248201527f4552433732313a20617070726f76652063616c6c6572206973206e6f74206f7760448201527f6e6572206e6f7220617070726f76656420666f7220616c6c000000000000000060648201526084016109d7565b610c3a838361199a565b505050565b6006546001600160a01b03163314610c695760405162461bcd60e51b81526004016109d790612a58565b60026007541415610c8c5760405162461bcd60e51b81526004016109d790612ade565b6002600755600d54606490610ca2908390612b46565b1115610cc1576040516313c902d560e31b815260040160405180910390fd5b60005b81811015610d0857610cda600a80546001019055565b610d007384eb8d02819bd90c766d23370c8926d857ce1505610cfb600a5490565b611a08565b600101610cc4565b50600d805482019055600080516020612cc3833981519152610d286118eb565b60405190815260200160405180910390a1506001600755565b610d4b3382611b4a565b610d675760405162461bcd60e51b81526004016109d790612a8d565b610c3a838383611c3d565b6006546001600160a01b03163314610d9c5760405162461bcd60e51b81526004016109d790612a58565b6012805460ff19811660ff90911615179055565b6006546001600160a01b03163314610dda5760405162461bcd60e51b81526004016109d790612a58565b60026007541415610dfd5760405162461bcd60e51b81526004016109d790612ade565b600260075560405160009073ff3a0a8b9b38fcfe22e738b4639a6e978bf3b0809047908381818185875af1925050503d8060008114610e58576040519150601f19603f3d011682016040523d82523d6000602084013e610e5d565b606091505b5050905080610e7f576040516327fcd9d160e01b815260040160405180910390fd5b506001600755565b6006546001600160a01b03163314610eb15760405162461bcd60e51b81526004016109d790612a58565b60026007541415610ed45760405162461bcd60e51b81526004016109d790612ade565b6002600755600b54606490610eea906014612b46565b1115610f0957604051632a3b0a3360e11b815260040160405180910390fd5b6001600160a01b0381166000908152600c602052604090205460ff1615610f4357604051631bbe6abd60e11b815260040160405180910390fd5b60005b6014811015610f7257610f5d600a80546001019055565b610f6a82610cfb600a5490565b600101610f46565b50600b805460140190556001600160a01b0381166000908152600c60205260409020805460ff19166001179055600080516020612cc3833981519152610d286118eb565b610c3a838383604051806020016040528060008152506117a9565b6006546001600160a01b03163314610ffb5760405162461bcd60e51b81526004016109d790612a58565b610c3a60098383612562565b6002600754141561102a5760405162461bcd60e51b81526004016109d790612ade565b600260075532331461104f57604051633458477760e01b815260040160405180910390fd5b6110576114a5565b61107457604051633167946760e21b815260040160405180910390fd5b6122b8611080600a5490565b61108b906001612b46565b11156110aa5760405163c30436e960e01b815260040160405180910390fd5b336000908152601460205260409020546001906110c79082612b46565b11156110e65760405163f7c164df60e01b815260040160405180910390fd5b604080516bffffffffffffffffffffffff193360601b16602080830191909152825180830360140181526034830184528051908201207f19457468657265756d205369676e6564204d6573736167653a0a333200000000605484015260708084019190915283518084039091018152609090920190925280519101206111a29083838080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250611dd992505050565b6111bf5760405163316f37ef60e01b815260040160405180910390fd5b6111c76116bb565b513410156111e85760405163311c9fd160e01b815260040160405180910390fd5b60138054600190810190915533600090815260146020526040902080549091019055611218600a80546001019055565b61122533610cfb600a5490565b600080516020612cc383398151915261123c6118eb565b60405190815260200160405180910390a150506001600755565b6000818152600260205260408120546001600160a01b0316806109a75760405162461bcd60e51b815260206004820152602960248201527f4552433732313a206f776e657220717565727920666f72206e6f6e657869737460448201526832b73a103a37b5b2b760b91b60648201526084016109d7565b600980546112da90612bd4565b80601f016020809104026020016040519081016040528092919081815260200182805461130690612bd4565b80156113535780601f1061132857610100808354040283529160200191611353565b820191906000526020600020905b81548152906001019060200180831161133657829003601f168201915b505050505081565b6006546001600160a01b031633146113855760405162461bcd60e51b81526004016109d790612a58565b601555565b60006001600160a01b0382166113f55760405162461bcd60e51b815260206004820152602a60248201527f4552433732313a2062616c616e636520717565727920666f7220746865207a65604482015269726f206164647265737360b01b60648201526084016109d7565b506001600160a01b031660009081526003602052604090205490565b6006546001600160a01b0316331461143b5760405162461bcd60e51b81526004016109d790612a58565b6114456000611dfd565b565b6006546001600160a01b031633146114715760405162461bcd60e51b81526004016109d790612a58565b601055565b6006546001600160a01b031633146114a05760405162461bcd60e51b81526004016109d790612a58565b600e55565b6000806015541180156114ba57506015544210155b905090565b600260075414156114e25760405162461bcd60e51b81526004016109d790612ade565b600260075532331461150757604051633458477760e01b815260040160405180910390fd5b60125460ff16158061151c575061151c6114a5565b1561153a5760405163fc7d083760e01b815260040160405180910390fd5b6110868160115461154b9190612b46565b111561156a57604051637e53eae760e11b815260040160405180910390fd5b336000908152600f60205260409020548290611587908390612b46565b11156115a657604051631289a7bb60e11b815260040160405180910390fd5b6040516bffffffffffffffffffffffff193360601b166020820152603481018390526000906054016040516020818303038152906040528051906020012090506115f38460105483611e4f565b6116105760405163522fc3bd60e01b815260040160405180910390fd5b81600e5461161e9190612b72565b34101561163e5760405163311c9fd160e01b815260040160405180910390fd5b6011805483019055336000908152600f602052604081208054840190555b8281101561168757611672600a80546001019055565b61167f33610cfb600a5490565b60010161165c565b50600080516020612cc383398151915261169f6118eb565b60405190815260200160405180910390a1505060016007555050565b60408051808201909152600080825260208201526000610384601554426116e29190612b91565b6116ec9190612b5e565b9050600061170267016345785d8a000083612b72565b9050611721604051806040016040528060008152602001600081525090565b816016541180156117405750600e548260165461173e9190612b91565b115b611760576040518060400160405280600e54815260200142815250611783565b6040518060400160405280836016546117799190612b91565b8152602001428152505b949350505050565b606060018054610a1190612bd4565b6117a5338383611e65565b5050565b6117b33383611b4a565b6117cf5760405162461bcd60e51b81526004016109d790612a8d565b6117db84848484611f34565b50505050565b6000818152600260205260409020546060906001600160a01b03166118605760405162461bcd60e51b815260206004820152602f60248201527f4552433732314d657461646174613a2055524920717565727920666f72206e6f60448201526e3732bc34b9ba32b73a103a37b5b2b760891b60648201526084016109d7565b600061186a611f67565b9050600081511161188a57604051806020016040528060008152506118b5565b8061189484611f76565b6040516020016118a5929190612987565b6040516020818303038152906040525b9392505050565b6006546001600160a01b031633146118e65760405162461bcd60e51b81526004016109d790612a58565b601655565b60006118f6600a5490565b6122b803905090565b6006546001600160a01b031633146119295760405162461bcd60e51b81526004016109d790612a58565b6001600160a01b03811661198e5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b60648201526084016109d7565b61199781611dfd565b50565b600081815260046020526040902080546001600160a01b0319166001600160a01b03841690811790915581906119cf82611256565b6001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45050565b6001600160a01b038216611a5e5760405162461bcd60e51b815260206004820181905260248201527f4552433732313a206d696e7420746f20746865207a65726f206164647265737360448201526064016109d7565b6000818152600260205260409020546001600160a01b031615611ac35760405162461bcd60e51b815260206004820152601c60248201527f4552433732313a20746f6b656e20616c7265616479206d696e7465640000000060448201526064016109d7565b6001600160a01b0382166000908152600360205260408120805460019290611aec908490612b46565b909155505060008181526002602052604080822080546001600160a01b0319166001600160a01b03861690811790915590518392907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908290a45050565b6000818152600260205260408120546001600160a01b0316611bc35760405162461bcd60e51b815260206004820152602c60248201527f4552433732313a206f70657261746f7220717565727920666f72206e6f6e657860448201526b34b9ba32b73a103a37b5b2b760a11b60648201526084016109d7565b6000611bce83611256565b9050806001600160a01b0316846001600160a01b03161480611c095750836001600160a01b0316611bfe84610a94565b6001600160a01b0316145b8061178357506001600160a01b0380821660009081526005602090815260408083209388168352929052205460ff16611783565b826001600160a01b0316611c5082611256565b6001600160a01b031614611cb45760405162461bcd60e51b815260206004820152602560248201527f4552433732313a207472616e736665722066726f6d20696e636f72726563742060448201526437bbb732b960d91b60648201526084016109d7565b6001600160a01b038216611d165760405162461bcd60e51b8152602060048201526024808201527f4552433732313a207472616e7366657220746f20746865207a65726f206164646044820152637265737360e01b60648201526084016109d7565b611d2160008261199a565b6001600160a01b0383166000908152600360205260408120805460019290611d4a908490612b91565b90915550506001600160a01b0382166000908152600360205260408120805460019290611d78908490612b46565b909155505060008181526002602052604080822080546001600160a01b0319166001600160a01b0386811691821790925591518493918716917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4505050565b6000611de58383612074565b6008546001600160a01b039182169116149392505050565b600680546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600082611e5c8584612098565b14949350505050565b816001600160a01b0316836001600160a01b03161415611ec75760405162461bcd60e51b815260206004820152601960248201527f4552433732313a20617070726f766520746f2063616c6c65720000000000000060448201526064016109d7565b6001600160a01b03838116600081815260056020908152604080832094871680845294825291829020805460ff191686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b611f3f848484611c3d565b611f4b84848484612104565b6117db5760405162461bcd60e51b81526004016109d790612a06565b606060098054610a1190612bd4565b606081611f9a5750506040805180820190915260018152600360fc1b602082015290565b8160005b8115611fc45780611fae81612c0f565b9150611fbd9050600a83612b5e565b9150611f9e565b60008167ffffffffffffffff811115611fdf57611fdf612c96565b6040519080825280601f01601f191660200182016040528015612009576020820181803683370190505b5090505b84156117835761201e600183612b91565b915061202b600a86612c2a565b612036906030612b46565b60f81b81838151811061204b5761204b612c80565b60200101906001600160f81b031916908160001a90535061206d600a86612b5e565b945061200d565b60008060006120838585612211565b9150915061209081612281565b509392505050565b600081815b84518110156120905760008582815181106120ba576120ba612c80565b602002602001015190508083116120e057600083815260208290526040902092506120f1565b600081815260208490526040902092505b50806120fc81612c0f565b91505061209d565b60006001600160a01b0384163b1561220657604051630a85bd0160e11b81526001600160a01b0385169063150b7a02906121489033908990889088906004016129b6565b602060405180830381600087803b15801561216257600080fd5b505af1925050508015612192575060408051601f3d908101601f1916820190925261218f918101906128fc565b60015b6121ec573d8080156121c0576040519150601f19603f3d011682016040523d82523d6000602084013e6121c5565b606091505b5080516121e45760405162461bcd60e51b81526004016109d790612a06565b805181602001fd5b6001600160e01b031916630a85bd0160e11b149050611783565b506001949350505050565b6000808251604114156122485760208301516040840151606085015160001a61223c8782858561243c565b9450945050505061227a565b8251604014156122725760208301516040840151612267868383612529565b93509350505061227a565b506000905060025b9250929050565b600081600481111561229557612295612c6a565b141561229e5750565b60018160048111156122b2576122b2612c6a565b14156123005760405162461bcd60e51b815260206004820152601860248201527f45434453413a20696e76616c6964207369676e6174757265000000000000000060448201526064016109d7565b600281600481111561231457612314612c6a565b14156123625760405162461bcd60e51b815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e6774680060448201526064016109d7565b600381600481111561237657612376612c6a565b14156123cf5760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202773272076616c604482015261756560f01b60648201526084016109d7565b60048160048111156123e3576123e3612c6a565b14156119975760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202776272076616c604482015261756560f01b60648201526084016109d7565b6000807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08311156124735750600090506003612520565b8460ff16601b1415801561248b57508460ff16601c14155b1561249c5750600090506004612520565b6040805160008082526020820180845289905260ff881692820192909252606081018690526080810185905260019060a0016020604051602081039080840390855afa1580156124f0573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b03811661251957600060019250925050612520565b9150600090505b94509492505050565b6000806001600160ff1b0383168161254660ff86901c601b612b46565b90506125548782888561243c565b935093505050935093915050565b82805461256e90612bd4565b90600052602060002090601f01602090048101928261259057600085556125d6565b82601f106125a95782800160ff198235161785556125d6565b828001600101855582156125d6579182015b828111156125d65782358255916020019190600101906125bb565b506125e29291506125e6565b5090565b5b808211156125e257600081556001016125e7565b80356001600160a01b038116811461261257600080fd5b919050565b60008083601f84011261262957600080fd5b50813567ffffffffffffffff81111561264157600080fd5b60208301915083602082850101111561227a57600080fd5b60006020828403121561266b57600080fd5b6118b5826125fb565b6000806040838503121561268757600080fd5b612690836125fb565b915061269e602084016125fb565b90509250929050565b6000806000606084860312156126bc57600080fd5b6126c5846125fb565b92506126d3602085016125fb565b9150604084013590509250925092565b600080600080608085870312156126f957600080fd5b612702856125fb565b935060206127118187016125fb565b935060408601359250606086013567ffffffffffffffff8082111561273557600080fd5b818801915088601f83011261274957600080fd5b81358181111561275b5761275b612c96565b61276d601f8201601f19168501612b15565b9150808252898482850101111561278357600080fd5b808484018584013760008482840101525080935050505092959194509250565b600080604083850312156127b657600080fd5b6127bf836125fb565b9150602083013580151581146127d457600080fd5b809150509250929050565b600080604083850312156127f257600080fd5b6127fb836125fb565b946020939093013593505050565b60008060006060848603121561281e57600080fd5b833567ffffffffffffffff8082111561283657600080fd5b818601915086601f83011261284a57600080fd5b813560208282111561285e5761285e612c96565b8160051b925061286f818401612b15565b8281528181019085830185870184018c101561288a57600080fd5b600096505b848710156128ad57803583526001969096019591830191830161288f565b509a918901359950506040909701359695505050505050565b6000602082840312156128d857600080fd5b5035919050565b6000602082840312156128f157600080fd5b81356118b581612cac565b60006020828403121561290e57600080fd5b81516118b581612cac565b6000806020838503121561292c57600080fd5b823567ffffffffffffffff81111561294357600080fd5b61294f85828601612617565b90969095509350505050565b60008151808452612973816020860160208601612ba8565b601f01601f19169290920160200192915050565b60008351612999818460208801612ba8565b8351908301906129ad818360208801612ba8565b01949350505050565b6001600160a01b03858116825284166020820152604081018390526080606082018190526000906129e99083018461295b565b9695505050505050565b6020815260006118b5602083018461295b565b60208082526032908201527f4552433732313a207472616e7366657220746f206e6f6e20455243373231526560408201527131b2b4bb32b91034b6b83632b6b2b73a32b960711b606082015260800190565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b60208082526031908201527f4552433732313a207472616e736665722063616c6c6572206973206e6f74206f6040820152701ddb995c881b9bdc88185c1c1c9bdd9959607a1b606082015260800190565b6020808252601f908201527f5265656e7472616e637947756172643a207265656e7472616e742063616c6c00604082015260600190565b604051601f8201601f1916810167ffffffffffffffff81118282101715612b3e57612b3e612c96565b604052919050565b60008219821115612b5957612b59612c3e565b500190565b600082612b6d57612b6d612c54565b500490565b6000816000190483118215151615612b8c57612b8c612c3e565b500290565b600082821015612ba357612ba3612c3e565b500390565b60005b83811015612bc3578181015183820152602001612bab565b838111156117db5750506000910152565b600181811c90821680612be857607f821691505b60208210811415612c0957634e487b7160e01b600052602260045260246000fd5b50919050565b6000600019821415612c2357612c23612c3e565b5060010190565b600082612c3957612c39612c54565b500690565b634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052601260045260246000fd5b634e487b7160e01b600052602160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052604160045260246000fd5b6001600160e01b03198116811461199757600080fdfe176b02bb2d12439ff7a20b59f402cca16c76f50508b13ef3166a600eb719354aa2646970667358221220f686aff5cbfaa07cb172da2795b54a0696e596c92507bd33553dc52af5deee0164736f6c634300080600330000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000057a796677560000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011426f7265644170655961636874436c7562000000000000000000000000000000",
    "contractAddress": "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    "cumulativeGasUsed": "13539238",
    "gasUsed": "3893600",
    "confirmations": "7523495",
    "methodId": "0x60806040",
    "functionName": "atInversebrah(int248 a, uint48[] b, uint32 c, bytes20[] d, bytes30[] e)",
    "trace_address": [
      -1
    ]
  }
]
const assertions = {
  "0x22199329b0aa1aa68902a78e3b32ca327c872fab166c7a2838273de6ad383eba": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ]
}
