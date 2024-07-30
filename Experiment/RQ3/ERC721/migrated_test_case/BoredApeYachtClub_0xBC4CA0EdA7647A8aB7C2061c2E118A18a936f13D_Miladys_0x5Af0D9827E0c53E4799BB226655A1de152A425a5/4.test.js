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
    "input": "0x60a06040819052600060808190526200001b91600b91620001d1565b50600c805460ff191690556000600d553480156200003857600080fd5b5060408051808201825260068152654d696c61647960d01b6020808301919091528251808401909352600383526213525360ea1b9083015290620000836301ffc9a760e01b62000148565b815162000098906006906020850190620001d1565b508051620000ae906007906020840190620001d1565b50620000c16380ac58cd60e01b62000148565b620000d3635b5e139f60e01b62000148565b620000e563780e9d6360e01b62000148565b5060009050620000f4620001cd565b600a80546001600160a01b0319166001600160a01b038316908117909155604051919250906000907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3506200026d565b6001600160e01b03198082161415620001a8576040805162461bcd60e51b815260206004820152601c60248201527f4552433136353a20696e76616c696420696e7465726661636520696400000000604482015290519081900360640190fd5b6001600160e01b0319166000908152602081905260409020805460ff19166001179055565b3390565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200021457805160ff191683800117855562000244565b8280016001018555821562000244579182015b828111156200024457825182559160200191906001019062000227565b506200025292915062000256565b5090565b5b8082111562000252576000815560010162000257565b612c92806200027d6000396000f3fe6080604052600436106102045760003560e01c806370a0823111610118578063b88d4fde116100a0578063e01559ca1161006f578063e01559ca146109fd578063e380231514610a12578063e985e9c514610a27578063eb8d244414610a62578063f2fde38b14610a7757610204565b8063b88d4fde1461083f578063c4fba40414610910578063c87b56dd14610925578063d25e0ffa1461094f57610204565b80638da5cb5b116100e75780638da5cb5b1461070f57806395d89b4114610724578063a22cb46514610739578063b1e283de14610774578063b6d8e86f1461079157610204565b806370a0823114610661578063715018a614610694578063783efe24146106a95780637d5fcf9c146106dc57610204565b8063323ab4741161019b5780634f6ccce71161016a5780634f6ccce71461053257806355f804b31461055c5780636352211e1461060d57806365d388d7146106375780636c0360eb1461064c57610204565b8063323ab474146104b057806334918dfd146104c55780633ccfd60b146104da57806342842e0e146104ef57610204565b806310969523116101d7578063109695231461035c57806318160ddd1461040d57806323b872dd146104345780632f745c591461047757610204565b806301ffc9a71461020957806306fdde0314610251578063081812fc146102db578063095ea7b314610321575b600080fd5b34801561021557600080fd5b5061023d6004803603602081101561022c57600080fd5b50356001600160e01b031916610aaa565b604080519115158252519081900360200190f35b34801561025d57600080fd5b50610266610acd565b6040805160208082528351818301528351919283929083019185019080838360005b838110156102a0578181015183820152602001610288565b50505050905090810190601f1680156102cd5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156102e757600080fd5b50610305600480360360208110156102fe57600080fd5b5035610b63565b604080516001600160a01b039092168252519081900360200190f35b34801561032d57600080fd5b5061035a6004803603604081101561034457600080fd5b506001600160a01b038135169060200135610bc5565b005b34801561036857600080fd5b5061035a6004803603602081101561037f57600080fd5b810190602081018135600160201b81111561039957600080fd5b8201836020820111156103ab57600080fd5b803590602001918460018302840111600160201b831117156103cc57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610ca0945050505050565b34801561041957600080fd5b50610422610d19565b60408051918252519081900360200190f35b34801561044057600080fd5b5061035a6004803603606081101561045757600080fd5b506001600160a01b03813581169160208101359091169060400135610d2a565b34801561048357600080fd5b506104226004803603604081101561049a57600080fd5b506001600160a01b038135169060200135610d81565b3480156104bc57600080fd5b5061035a610dac565b3480156104d157600080fd5b5061035a610eb3565b3480156104e657600080fd5b5061035a610f29565b3480156104fb57600080fd5b5061035a6004803603606081101561051257600080fd5b506001600160a01b03813581169160208101359091169060400135610fba565b34801561053e57600080fd5b506104226004803603602081101561055557600080fd5b5035610fd5565b34801561056857600080fd5b5061035a6004803603602081101561057f57600080fd5b810190602081018135600160201b81111561059957600080fd5b8201836020820111156105ab57600080fd5b803590602001918460018302840111600160201b831117156105cc57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610feb945050505050565b34801561061957600080fd5b506103056004803603602081101561063057600080fd5b5035611059565b34801561064357600080fd5b50610422611081565b34801561065857600080fd5b50610266611087565b34801561066d57600080fd5b506104226004803603602081101561068457600080fd5b50356001600160a01b03166110e8565b3480156106a057600080fd5b5061035a611150565b3480156106b557600080fd5b5061023d600480360360208110156106cc57600080fd5b50356001600160a01b03166111fc565b3480156106e857600080fd5b5061023d600480360360208110156106ff57600080fd5b50356001600160a01b0316611211565b34801561071b57600080fd5b50610305611226565b34801561073057600080fd5b50610266611235565b34801561074557600080fd5b5061035a6004803603604081101561075c57600080fd5b506001600160a01b0381351690602001351515611296565b61035a6004803603602081101561078a57600080fd5b503561139b565b34801561079d57600080fd5b5061035a600480360360208110156107b457600080fd5b810190602081018135600160201b8111156107ce57600080fd5b8201836020820111156107e057600080fd5b803590602001918460208302840111600160201b8311171561080157600080fd5b9190808060200260200160405190810160405280939291908181526020018383602002808284376000920191909152509295506115bc945050505050565b34801561084b57600080fd5b5061035a6004803603608081101561086257600080fd5b6001600160a01b03823581169260208101359091169160408201359190810190608081016060820135600160201b81111561089c57600080fd5b8201836020820111156108ae57600080fd5b803590602001918460018302840111600160201b831117156108cf57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611674945050505050565b34801561091c57600080fd5b506102666116d2565b34801561093157600080fd5b506102666004803603602081101561094857600080fd5b5035611760565b34801561095b57600080fd5b5061035a6004803603602081101561097257600080fd5b810190602081018135600160201b81111561098c57600080fd5b82018360208201111561099e57600080fd5b803590602001918460208302840111600160201b831117156109bf57600080fd5b9190808060200260200160405190810160405280939291908181526020018383602002808284376000920191909152509295506119e3945050505050565b348015610a0957600080fd5b50610422611a9b565b348015610a1e57600080fd5b50610422611aa0565b348015610a3357600080fd5b5061023d60048036036040811015610a4a57600080fd5b506001600160a01b0381358116916020013516611aa6565b348015610a6e57600080fd5b5061023d611ad4565b348015610a8357600080fd5b5061035a60048036036020811015610a9a57600080fd5b50356001600160a01b0316611add565b6001600160e01b0319811660009081526020819052604090205460ff165b919050565b60068054604080516020601f6002600019610100600188161502019095169490940493840181900481028201810190925282815260609390929091830182828015610b595780601f10610b2e57610100808354040283529160200191610b59565b820191906000526020600020905b815481529060010190602001808311610b3c57829003601f168201915b5050505050905090565b6000610b6e82611be0565b610ba95760405162461bcd60e51b815260040180806020018281038252602c815260200180612b1d602c913960400191505060405180910390fd5b506000908152600460205260409020546001600160a01b031690565b6000610bd082611059565b9050806001600160a01b0316836001600160a01b03161415610c235760405162461bcd60e51b8152600401808060200182810382526021815260200180612bc16021913960400191505060405180910390fd5b806001600160a01b0316610c35611bed565b6001600160a01b03161480610c565750610c5681610c51611bed565b611aa6565b610c915760405162461bcd60e51b8152600401808060200182810382526038815260200180612a246038913960400191505060405180910390fd5b610c9b8383611bf1565b505050565b610ca8611bed565b6001600160a01b0316610cb9611226565b6001600160a01b031614610d02576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b8051610d1590600b9060208401906128c6565b5050565b6000610d256002611c5f565b905090565b610d3b610d35611bed565b82611c6a565b610d765760405162461bcd60e51b8152600401808060200182810382526031815260200180612be26031913960400191505060405180910390fd5b610c9b838383611d0e565b6001600160a01b0382166000908152600160205260408120610da39083611e5a565b90505b92915050565b336000908152600f602052604090205460ff1680610dd95750336000908152600e602052604090205460ff165b610e23576040805162461bcd60e51b81526020600482015260166024820152751cd95b99195c881b9bdd081dda1a5d195b1a5cdd195960521b604482015290519081900360640190fd5b336000908152600f602052604081205460ff1615610e5a5750336000908152600f60205260409020805460ff191690556002610e75565b50336000908152600e60205260409020805460ff1916905560015b60005b8181108015610e8f5750612710610e8d610d19565b105b15610d15576000610e9e610d19565b9050610eaa3382611e66565b50600101610e78565b610ebb611bed565b6001600160a01b0316610ecc611226565b6001600160a01b031614610f15576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b600c805460ff19811660ff90911615179055565b610f31611bed565b6001600160a01b0316610f42611226565b6001600160a01b031614610f8b576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b6040514790339082156108fc029083906000818181858888f19350505050158015610d15573d6000803e3d6000fd5b610c9b83838360405180602001604052806000815250611674565b600080610fe3600284611e80565b509392505050565b610ff3611bed565b6001600160a01b0316611004611226565b6001600160a01b03161461104d576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b61105681611e9c565b50565b6000610da682604051806060016040528060298152602001612a866029913960029190611eaf565b61251c81565b60098054604080516020601f6002600019610100600188161502019095169490940493840181900481028201810190925282815260609390929091830182828015610b595780601f10610b2e57610100808354040283529160200191610b59565b60006001600160a01b03821661112f5760405162461bcd60e51b815260040180806020018281038252602a815260200180612a5c602a913960400191505060405180910390fd5b6001600160a01b0382166000908152600160205260409020610da690611c5f565b611158611bed565b6001600160a01b0316611169611226565b6001600160a01b0316146111b2576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b600a546040516000916001600160a01b0316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3600a80546001600160a01b0319169055565b600f6020526000908152604090205460ff1681565b600e6020526000908152604090205460ff1681565b600a546001600160a01b031690565b60078054604080516020601f6002600019610100600188161502019095169490940493840181900481028201810190925282815260609390929091830182828015610b595780601f10610b2e57610100808354040283529160200191610b59565b61129e611bed565b6001600160a01b0316826001600160a01b03161415611304576040805162461bcd60e51b815260206004820152601960248201527f4552433732313a20617070726f766520746f2063616c6c657200000000000000604482015290519081900360640190fd5b8060056000611311611bed565b6001600160a01b03908116825260208083019390935260409182016000908120918716808252919093529120805460ff191692151592909217909155611355611bed565b6001600160a01b03167f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c318360405180821515815260200191505060405180910390a35050565b600c5460ff166113dc5760405162461bcd60e51b8152600401808060200182810382526023815260200180612c136023913960400191505060405180910390fd5b601e81111561141c5760405162461bcd60e51b8152600401808060200182810382526027815260200180612c366027913960400191505060405180910390fd5b600d5461251c9061142d9083611ec6565b111561146a5760405162461bcd60e51b815260040180806020018281038252602b815260200180612aaf602b913960400191505060405180910390fd5b600081601e14156114e1575066d529ae9e860000346114898284611f20565b11156114dc576040805162461bcd60e51b815260206004820152601f60248201527f45746865722076616c75652073656e74206973206e6f7420636f727265637400604482015290519081900360640190fd5b611582565b600f82106114fd575066f8b0a10e470000346114898284611f20565b6005821061151a575067010a741a46278000346114898284611f20565b5067011c37937e0800003461152f8284611f20565b1115611582576040805162461bcd60e51b815260206004820152601f60248201527f45746865722076616c75652073656e74206973206e6f7420636f727265637400604482015290519081900360640190fd5b60005b82811015610c9b5761251c600d5410156115b4576115aa336115a5610d19565b611e66565b600d805460010190555b600101611585565b6115c4611bed565b6001600160a01b03166115d5611226565b6001600160a01b03161461161e576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b60005b8151811015610d1557600082828151811061163857fe5b6020908102919091018101516001600160a01b03166000908152600e90915260409020805460ff19166001908117909155919091019050611621565b61168561167f611bed565b83611c6a565b6116c05760405162461bcd60e51b8152600401808060200182810382526031815260200180612be26031913960400191505060405180910390fd5b6116cc84848484611f79565b50505050565b600b805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156117585780601f1061172d57610100808354040283529160200191611758565b820191906000526020600020905b81548152906001019060200180831161173b57829003601f168201915b505050505081565b606061176b82611be0565b6117a65760405162461bcd60e51b815260040180806020018281038252602f815260200180612b92602f913960400191505060405180910390fd5b60008281526008602090815260409182902080548351601f600260001961010060018616150201909316929092049182018490048402810184019094528084526060939283018282801561183b5780601f106118105761010080835404028352916020019161183b565b820191906000526020600020905b81548152906001019060200180831161181e57829003601f168201915b50505050509050606061184c611087565b905080516000141561186057509050610ac8565b8151156119215780826040516020018083805190602001908083835b6020831061189b5780518252601f19909201916020918201910161187c565b51815160209384036101000a600019018019909216911617905285519190930192850191508083835b602083106118e35780518252601f1990920191602091820191016118c4565b6001836020036101000a0380198251168184511680821785525050505050509050019250505060405160208183030381529060405292505050610ac8565b8061192b85611fcb565b6040516020018083805190602001908083835b6020831061195d5780518252601f19909201916020918201910161193e565b51815160209384036101000a600019018019909216911617905285519190930192850191508083835b602083106119a55780518252601f199092019160209182019101611986565b6001836020036101000a0380198251168184511680821785525050505050509050019250505060405160208183030381529060405292505050919050565b6119eb611bed565b6001600160a01b03166119fc611226565b6001600160a01b031614611a45576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b60005b8151811015610d15576000828281518110611a5f57fe5b6020908102919091018101516001600160a01b03166000908152600f90915260409020805460ff19166001908117909155919091019050611a48565b601e81565b600d5481565b6001600160a01b03918216600090815260056020908152604080832093909416825291909152205460ff1690565b600c5460ff1681565b611ae5611bed565b6001600160a01b0316611af6611226565b6001600160a01b031614611b3f576040805162461bcd60e51b81526020600482018190526024820152600080516020612b49833981519152604482015290519081900360640190fd5b6001600160a01b038116611b845760405162461bcd60e51b81526004018080602001828103825260268152602001806129ae6026913960400191505060405180910390fd5b600a546040516001600160a01b038084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a3600a80546001600160a01b0319166001600160a01b0392909216919091179055565b6000610da66002836120a6565b3390565b600081815260046020526040902080546001600160a01b0319166001600160a01b0384169081179091558190611c2682611059565b6001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45050565b6000610da6826120b2565b6000611c7582611be0565b611cb05760405162461bcd60e51b815260040180806020018281038252602c8152602001806129f8602c913960400191505060405180910390fd5b6000611cbb83611059565b9050806001600160a01b0316846001600160a01b03161480611cf65750836001600160a01b0316611ceb84610b63565b6001600160a01b0316145b80611d065750611d068185611aa6565b949350505050565b826001600160a01b0316611d2182611059565b6001600160a01b031614611d665760405162461bcd60e51b8152600401808060200182810382526029815260200180612b696029913960400191505060405180910390fd5b6001600160a01b038216611dab5760405162461bcd60e51b81526004018080602001828103825260248152602001806129d46024913960400191505060405180910390fd5b611db6838383610c9b565b611dc1600082611bf1565b6001600160a01b0383166000908152600160205260409020611de390826120b6565b506001600160a01b0382166000908152600160205260409020611e0690826120c2565b50611e13600282846120ce565b5080826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a4505050565b6000610da383836120e4565b610d15828260405180602001604052806000815250612148565b6000808080611e8f868661219a565b9097909650945050505050565b8051610d159060099060208401906128c6565b6000611ebc848484612215565b90505b9392505050565b600082820183811015610da3576040805162461bcd60e51b815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b600082611f2f57506000610da6565b82820282848281611f3c57fe5b0414610da35760405162461bcd60e51b8152600401808060200182810382526021815260200180612afc6021913960400191505060405180910390fd5b611f84848484611d0e565b611f90848484846122df565b6116cc5760405162461bcd60e51b815260040180806020018281038252603281526020018061297c6032913960400191505060405180910390fd5b606081611ff057506040805180820190915260018152600360fc1b6020820152610ac8565b8160005b811561200857600101600a82049150611ff4565b60608167ffffffffffffffff8111801561202157600080fd5b506040519080825280601f01601f19166020018201604052801561204c576020820181803683370190505b50859350905060001982015b831561209d57600a840660300160f81b8282806001900393508151811061207b57fe5b60200101906001600160f81b031916908160001a905350600a84049350612058565b50949350505050565b6000610da38383612447565b5490565b6000610da3838361245f565b6000610da38383612525565b6000611ebc84846001600160a01b03851661256f565b815460009082106121265760405162461bcd60e51b815260040180806020018281038252602281526020018061295a6022913960400191505060405180910390fd5b82600001828154811061213557fe5b9060005260206000200154905092915050565b6121528383612606565b61215f60008484846122df565b610c9b5760405162461bcd60e51b815260040180806020018281038252603281526020018061297c6032913960400191505060405180910390fd5b8154600090819083106121de5760405162461bcd60e51b8152600401808060200182810382526022815260200180612ada6022913960400191505060405180910390fd5b60008460000184815481106121ef57fe5b906000526020600020906002020190508060000154816001015492509250509250929050565b600082815260018401602052604081205482816122b05760405162461bcd60e51b81526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561227557818101518382015260200161225d565b50505050905090810190601f1680156122a25780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b508460000160018203815481106122c357fe5b9060005260206000209060020201600101549150509392505050565b60006122f3846001600160a01b0316612734565b6122ff57506001611d06565b606061240d630a85bd0160e11b612314611bed565b88878760405160240180856001600160a01b03168152602001846001600160a01b0316815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561237b578181015183820152602001612363565b50505050905090810190601f1680156123a85780820380516001836020036101000a031916815260200191505b5095505050505050604051602081830303815290604052906001600160e01b0319166020820180516001600160e01b03838183161783525050505060405180606001604052806032815260200161297c603291396001600160a01b038816919061273a565b9050600081806020019051602081101561242657600080fd5b50516001600160e01b031916630a85bd0160e11b1492505050949350505050565b60009081526001919091016020526040902054151590565b6000818152600183016020526040812054801561251b578354600019808301919081019060009087908390811061249257fe5b90600052602060002001549050808760000184815481106124af57fe5b6000918252602080832090910192909255828152600189810190925260409020908401905586548790806124df57fe5b60019003818190600052602060002001600090559055866001016000878152602001908152602001600020600090556001945050505050610da6565b6000915050610da6565b60006125318383612447565b61256757508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610da6565b506000610da6565b6000828152600184016020526040812054806125d4575050604080518082018252838152602080820184815286546001818101895560008981528481209551600290930290950191825591519082015586548684528188019092529290912055611ebf565b828560000160018303815481106125e757fe5b9060005260206000209060020201600101819055506000915050611ebf565b6001600160a01b038216612661576040805162461bcd60e51b815260206004820181905260248201527f4552433732313a206d696e7420746f20746865207a65726f2061646472657373604482015290519081900360640190fd5b61266a81611be0565b156126bc576040805162461bcd60e51b815260206004820152601c60248201527f4552433732313a20746f6b656e20616c7265616479206d696e74656400000000604482015290519081900360640190fd5b6126c860008383610c9b565b6001600160a01b03821660009081526001602052604090206126ea90826120c2565b506126f7600282846120ce565b5060405181906001600160a01b038416906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908290a45050565b3b151590565b6060611ebc84846000858561274e85612734565b61279f576040805162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e7472616374000000604482015290519081900360640190fd5b60006060866001600160a01b031685876040518082805190602001908083835b602083106127de5780518252601f1990920191602091820191016127bf565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038185875af1925050503d8060008114612840576040519150601f19603f3d011682016040523d82523d6000602084013e612845565b606091505b5091509150612855828286612860565b979650505050505050565b6060831561286f575081611ebf565b82511561287f5782518084602001fd5b60405162461bcd60e51b815260206004820181815284516024840152845185939192839260440191908501908083836000831561227557818101518382015260200161225d565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061290757805160ff1916838001178555612934565b82800160010185558215612934579182015b82811115612934578251825591602001919060010190612919565b50612940929150612944565b5090565b5b80821115612940576000815560010161294556fe456e756d657261626c655365743a20696e646578206f7574206f6620626f756e64734552433732313a207472616e7366657220746f206e6f6e20455243373231526563656976657220696d706c656d656e7465724f776e61626c653a206e6577206f776e657220697320746865207a65726f20616464726573734552433732313a207472616e7366657220746f20746865207a65726f20616464726573734552433732313a206f70657261746f7220717565727920666f72206e6f6e6578697374656e7420746f6b656e4552433732313a20617070726f76652063616c6c6572206973206e6f74206f776e6572206e6f7220617070726f76656420666f7220616c6c4552433732313a2062616c616e636520717565727920666f7220746865207a65726f20616464726573734552433732313a206f776e657220717565727920666f72206e6f6e6578697374656e7420746f6b656e507572636861736520776f756c6420657863656564206d617820737570706c79206f66204d696c61647973456e756d657261626c654d61703a20696e646578206f7574206f6620626f756e6473536166654d6174683a206d756c7469706c69636174696f6e206f766572666c6f774552433732313a20617070726f76656420717565727920666f72206e6f6e6578697374656e7420746f6b656e4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e65724552433732313a207472616e73666572206f6620746f6b656e2074686174206973206e6f74206f776e4552433732314d657461646174613a2055524920717565727920666f72206e6f6e6578697374656e7420746f6b656e4552433732313a20617070726f76616c20746f2063757272656e74206f776e65724552433732313a207472616e736665722063616c6c6572206973206e6f74206f776e6572206e6f7220617070726f76656453616c65206d7573742062652061637469766520746f206d696e74204d696c6164797343616e206f6e6c79206d696e7420757020746f20333020746f6b656e7320617420612074696d65a26469706673582212204a13d0213a02383c1e34458b83c5caa6a488e427320573c37e778f9df1b6d6f664736f6c63430007000033",
    "contractAddress": "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    "cumulativeGasUsed": "13539238",
    "gasUsed": "3893600",
    "confirmations": "7523495",
    "methodId": "0x60806040",
    "functionName": "atInversebrah(int248 a, uint48[] b, uint32 c, bytes20[] d, bytes30[] e)",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "12294655",
    "timeStamp": "1619156742",
    "hash": "0x43889f455b354b48a2cc22ef27786b26010305b2dd2a587b25278c3ba34a1b4f",
    "nonce": "8",
    "blockHash": "0xa17e0019d09ee67ef8d05f77aac49878ca82e709df02c7ee04fd76c59268d9e3",
    "transactionIndex": "179",
    "from": "0xaba7161a7fb69c88e16ed9f455ce62b791ee4d03",
    "to": "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    "value": "0",
    "gas": "68733",
    "gasPrice": "119000000000",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x34918dfd",
    "contractAddress": "",
    "cumulativeGasUsed": "11098590",
    "gasUsed": "45822",
    "confirmations": "7516347",
    "methodId": "0x34918dfd",
    "functionName": "flipSaleState()",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "12299047",
    "timeStamp": "1619214971",
    "hash": "0xeb144bd886f3ffcbcd6be12c660dbce1595caa2461a28f042963c2534fa340b7",
    "nonce": "0",
    "blockHash": "0x09a38695836da882d47e4e72fdfc92e868bca62e124270885b29a718af86fd28",
    "transactionIndex": "167",
    "from": "0xf7801b8115f3fe46ac55f8c0fdb5243726bdb66a",
    "to": "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
    "value": "80000000000000000",
    "gas": "260364",
    "gasPrice": "70000000000",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0xb1e283de0000000000000000000000000000000000000000000000000000000000000001",
    "contractAddress": "",
    "cumulativeGasUsed": "13410409",
    "gasUsed": "173576",
    "confirmations": "7511955",
    "methodId": "0xa723533e",
    "functionName": "mintApe(uint256 numberOfTokens)",
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
  ],
  "0x43889f455b354b48a2cc22ef27786b26010305b2dd2a587b25278c3ba34a1b4f": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ],
  "0xeb144bd886f3ffcbcd6be12c660dbce1595caa2461a28f042963c2534fa340b7": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ]
}
