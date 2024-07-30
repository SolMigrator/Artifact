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
    "blockNumber": "17046105",
    "timeStamp": "1681483895",
    "hash": "0x2afae7763487e60b893cb57803694810e6d3d136186a6de6719921afd7ca304a",
    "nonce": "0",
    "blockHash": "0xa4cf20c9c9e367e225464eba8dc7a6bb6af4de523144fd400345a0467c7d7041",
    "transactionIndex": "80",
    "from": "0xfbfeaf0da0f2fde5c66df570133ae35f3eb58c9a",
    "to": "",
    "value": "0",
    "gas": "1173624",
    "gasPrice": "31537151435",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x60806040526004805460a060020a60ff02191690556006805460ff199081169091556009805490911660011790553480156200003a57600080fd5b5060405162002726380380620027268339810180604052810190808051820192919060200180518201929190602001805190602001909291908051906020019092919080519060200190929190805190602001909291908051906020019092919080519060200190929190805190602001909291908051906020019092919050505060008060003333600360006101000a815481600160a060020a030219169083600160a060020a0316021790555080600660016101000a815481600160a060020a030219169083600160a060020a031602179055505033600360006101000a815481600160a060020a030219169083600160a060020a03160217905550600360009054906101000a9004600160a060020a0316600460006101000a815481600160a060020a030219169083600160a060020a031602179055508c600a90805190602001906200018c929190620006a4565b508b51620001a290600b9060208f0190620006a4565b50600c805460ff191660ff8c161761010060a860020a031916610100600160a060020a038b81169190910291909117909155600d8054600160a060020a03199081168a841617909155600e80548216898416179055600f805482168884161790556010805490911691861691909117905560008b1115620003dd57600a8b0615620002b457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602960248201527f5f696e697469616c537570706c792068617320746f2062652061206d756c697460448201527f706c65206f662031300000000000000000000000000000000000000000000000606482015290519081900360840190fd5b620002ea600a620002d58d600364010000000062001eb6620004cb82021704565b9064010000000062001edf620004fe82021704565b92506200030d600a620002d58d600264010000000062001eb6620004cb82021704565b91506200032a8b600a64010000000062001edf620004fe82021704565b600c5490915062000353906101009004600160a060020a03168464010000000062000514810204565b50600d546200037590600160a060020a03168364010000000062000514810204565b50600e546200039790600160a060020a03168364010000000062000514810204565b50600f54620003b990600160a060020a03168364010000000062000514810204565b50601054620003db90600160a060020a03168264010000000062000514810204565b505b881515620004b857620003f86401000000006200062d810204565b50600154600010620004b857604080517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048201526044602482018190527f546f74616c20737570706c7920697320726571756972656420746f2062652061908201527f626f766520302069662074686520746f6b656e206973206e6f74206d696e746160648201527f626c652e00000000000000000000000000000000000000000000000000000000608482015290519081900360a40190fd5b5050505050505050505050505062000746565b6000821515620004de57506000620004f8565b50818102818382811515620004ef57fe5b0414620004f857fe5b92915050565b600081838115156200050c57fe5b049392505050565b600354600090600160a060020a031633146200052f57600080fd5b60065460ff16156200054057600080fd5b6001546200055d908364010000000062001ca76200069682021704565b600155600160a060020a03831660009081526020819052604090205462000593908364010000000062001ca76200069682021704565b600160a060020a03841660008181526020818152604091829020939093558051858152905191927f0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d412139688592918290030190a2604080518381529051600160a060020a038516916000917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9181900360200190a350600192915050565b600354600090600160a060020a031633146200064857600080fd5b60065460ff16156200065957600080fd5b6006805460ff191660011790556040517fae5184fba832cb2b1f702aca6117b8d265eaf03ad33eb133f19dde0f5920fa0890600090a15060015b90565b81810182811015620004f857fe5b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620006e757805160ff191683800117855562000717565b8280016001018555821562000717579182015b8281111562000717578251825591602001919060010190620006fa565b506200072592915062000729565b5090565b6200069391905b8082111562000725576000815560010162000730565b611fd080620007566000396000f3006080604052600436106101c15763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166302f652a381146101c657806305d2035b146101ee57806306fdde0314610217578063095ea7b3146102a157806318160ddd146102c55780631f3bec3b146102ec57806323b872dd1461031d57806329ff4f5314610347578063313ce5671461036857806340c10f191461039357806345977d03146103b75780635de4ccb0146103cf5780635f412d4f146103e4578063600440cb146103f9578063642b4a4d1461040e578063661884631461042357806370a0823114610447578063715018a6146104685780637d64bcb41461047d5780638444b39114610492578063867c2857146104cb5780638da5cb5b146104ec57806395d89b411461050157806396132521146105165780639738968c1461052b578063a9059cbb14610540578063adf403ad14610564578063ae1616b014610579578063c752ff621461058e578063d1f276d3146105a3578063d73dd623146105b8578063d7e7088a146105dc578063dd62ed3e146105fd578063dd681e5114610624578063f2fde38b14610639578063ffeb7d751461065a575b600080fd5b3480156101d257600080fd5b506101ec600160a060020a0360043516602435151561067b565b005b3480156101fa57600080fd5b50610203610770565b604080519115158252519081900360200190f35b34801561022357600080fd5b5061022c610779565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561026657818101518382015260200161024e565b50505050905090810190601f1680156102935780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3480156102ad57600080fd5b50610203600160a060020a0360043516602435610807565b3480156102d157600080fd5b506102da61086e565b60408051918252519081900360200190f35b3480156102f857600080fd5b506103016108b2565b60408051600160a060020a039092168252519081900360200190f35b34801561032957600080fd5b50610203600160a060020a03600435811690602435166044356108c6565b34801561035357600080fd5b506101ec600160a060020a03600435166109d7565b34801561037457600080fd5b5061037d610ad0565b6040805160ff9092168252519081900360200190f35b34801561039f57600080fd5b50610203600160a060020a0360043516602435610ad9565b3480156103c357600080fd5b506101ec600435610bdc565b3480156103db57600080fd5b50610301610e18565b3480156103f057600080fd5b506101ec610e27565b34801561040557600080fd5b50610301610eb4565b34801561041a57600080fd5b50610301610ec8565b34801561042f57600080fd5b50610203600160a060020a0360043516602435610ed7565b34801561045357600080fd5b506102da600160a060020a0360043516610fc6565b34801561047457600080fd5b506101ec610fe1565b34801561048957600080fd5b5061020361104f565b34801561049e57600080fd5b506104a76110b5565b604051808260038111156104b757fe5b60ff16815260200191505060405180910390f35b3480156104d757600080fd5b50610203600160a060020a03600435166110ef565b3480156104f857600080fd5b50610301611104565b34801561050d57600080fd5b5061022c611113565b34801561052257600080fd5b5061020361116e565b34801561053757600080fd5b5061020361117e565b34801561054c57600080fd5b50610203600160a060020a036004351660243561119d565b34801561057057600080fd5b506103016112ac565b34801561058557600080fd5b506103016112bb565b34801561059a57600080fd5b506102da6112ca565b3480156105af57600080fd5b506103016112d0565b3480156105c457600080fd5b50610203600160a060020a03600435166024356112df565b3480156105e857600080fd5b506101ec600160a060020a0360043516611378565b34801561060957600080fd5b506102da600160a060020a0360043581169060243516611941565b34801561063057600080fd5b5061030161196c565b34801561064557600080fd5b506101ec600160a060020a036004351661197b565b34801561066657600080fd5b506101ec600160a060020a036004351661199e565b600354600160a060020a0316331461069257600080fd5b60045460009060a060020a900460ff1615610744576040805160e560020a62461bcd028152602060048201526044602482018190527f4974277320726571756972656420746861742074686520737461746520746f20908201527f636865636b20616c69676e732077697468207468652072656c6561736564206660648201527f6c61672e00000000000000000000000000000000000000000000000000000000608482015290519081900360a40190fd5b50600160a060020a03919091166000908152600560205260409020805460ff1916911515919091179055565b60065460ff1681565b600a805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156107ff5780601f106107d4576101008083540402835291602001916107ff565b820191906000526020600020905b8154815290600101906020018083116107e257829003601f168201915b505050505081565b336000818152600260209081526040808320600160a060020a038716808552908352818420869055815186815291519394909390927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925928290030190a35060015b92915050565b600080805260208190527fad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5546001546108ac9163ffffffff611b2016565b90505b90565b600c546101009004600160a060020a031681565b600454600090849060a060020a900460ff16806108fb5750600160a060020a03811660009081526005602052604090205460ff165b15156109c3576040805160e560020a62461bcd02815260206004820152607f60248201527f466f722074686520746f6b656e20746f2062652061626c6520746f207472616e60448201527f736665723a20697427732072657175697265642074686174207468652063726f60648201527f776473616c6520697320696e2072656c65617365642073746174653b206f722060848201527f7468652073656e6465722069732061207472616e73666572206167656e742e0060a482015290519081900360c40190fd5b6109ce858585611b32565b95945050505050565b600354600160a060020a031633146109ee57600080fd5b60045460009060a060020a900460ff1615610aa0576040805160e560020a62461bcd028152602060048201526044602482018190527f4974277320726571756972656420746861742074686520737461746520746f20908201527f636865636b20616c69676e732077697468207468652072656c6561736564206660648201527f6c61672e00000000000000000000000000000000000000000000000000000000608482015290519081900360a40190fd5b506004805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0392909216919091179055565b600c5460ff1681565b600354600090600160a060020a03163314610af357600080fd5b60065460ff1615610b0357600080fd5b600154610b16908363ffffffff611ca716565b600155600160a060020a038316600090815260208190526040902054610b42908363ffffffff611ca716565b600160a060020a03841660008181526020818152604091829020939093558051858152905191927f0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d412139688592918290030190a2604080518381529051600160a060020a038516916000917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9181900360200190a350600192915050565b6000610be66110b5565b90506003816003811115610bf657fe5b14610c71576040805160e560020a62461bcd02815260206004820152602e60248201527f497427732072657175697265642074686174207468652075706772616465207360448201527f746174652069732072656164792e000000000000000000000000000000000000606482015290519081900360840190fd5b60008211610cef576040805160e560020a62461bcd02815260206004820152602c60248201527f54686520757067726164652076616c756520697320726571756972656420746f60448201527f2062652061626f766520302e0000000000000000000000000000000000000000606482015290519081900360840190fd5b33600090815260208190526040902054610d0f908363ffffffff611b2016565b33600090815260208190526040902055600154610d32908363ffffffff611b2016565b600155600854610d48908363ffffffff611ca716565b600855600754604080517f753e88e5000000000000000000000000000000000000000000000000000000008152336004820152602481018590529051600160a060020a039092169163753e88e59160448082019260009290919082900301818387803b158015610db757600080fd5b505af1158015610dcb573d6000803e3d6000fd5b5050600754604080518681529051600160a060020a0390921693503392507f7e5c344a8141a805725cb476f76c6953b842222b967edd1f78ddb6e8b3f397ac919081900360200190a35050565b600754600160a060020a031681565b600454600160a060020a03163314610e9d576040805160e560020a62461bcd0281526020600482015260316024820152600080516020611f8583398151915260448201527f20612072656c65617365206167656e742e000000000000000000000000000000606482015290519081900360840190fd5b6006805460ff19166001179055610eb2611cb4565b565b6006546101009004600160a060020a031681565b600d54600160a060020a031681565b336000908152600260209081526040808320600160a060020a0386168452909152812054808310610f2b57336000908152600260209081526040808320600160a060020a0388168452909152812055610f60565b610f3b818463ffffffff611b2016565b336000908152600260209081526040808320600160a060020a03891684529091529020555b336000818152600260209081526040808320600160a060020a0389168085529083529281902054815190815290519293927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925929181900390910190a35060019392505050565b600160a060020a031660009081526020819052604090205490565b600354600160a060020a03163314610ff857600080fd5b600354604051600160a060020a03909116907ff8df31144d9c2f0f6b59d69b8b98abd5459d07f2742c4df920b25aae33c6482090600090a26003805473ffffffffffffffffffffffffffffffffffffffff19169055565b600354600090600160a060020a0316331461106957600080fd5b60065460ff161561107957600080fd5b6006805460ff191660011790556040517fae5184fba832cb2b1f702aca6117b8d265eaf03ad33eb133f19dde0f5920fa0890600090a150600190565b60006110bf61117e565b15156110cd575060016108af565b600754600160a060020a031615156110e7575060026108af565b5060036108af565b60056020526000908152604090205460ff1681565b600354600160a060020a031681565b600b805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156107ff5780601f106107d4576101008083540402835291602001916107ff565b60045460a060020a900460ff1681565b60045460009060a060020a900460ff1680156108ac57506108ac611d50565b600454600090339060a060020a900460ff16806111d25750600160a060020a03811660009081526005602052604090205460ff165b151561129a576040805160e560020a62461bcd02815260206004820152607f60248201527f466f722074686520746f6b656e20746f2062652061626c6520746f207472616e60448201527f736665723a20697427732072657175697265642074686174207468652063726f60648201527f776473616c6520697320696e2072656c65617365642073746174653b206f722060848201527f7468652073656e6465722069732061207472616e73666572206167656e742e0060a482015290519081900360c40190fd5b6112a48484611d59565b949350505050565b600e54600160a060020a031681565b601054600160a060020a031681565b60085481565b600454600160a060020a031681565b336000908152600260209081526040808320600160a060020a0386168452909152812054611313908363ffffffff611ca716565b336000818152600260209081526040808320600160a060020a0389168085529083529281902085905580519485525191937f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925929081900390910190a350600192915050565b61138061117e565b1515611422576040805160e560020a62461bcd02815260206004820152604960248201527f4974277320726571756972656420746f20626520696e2063616e55706772616460448201527f65282920636f6e646974696f6e207768656e2073657474696e6720757067726160648201527f6465206167656e742e0000000000000000000000000000000000000000000000608482015290519081900360a40190fd5b600160a060020a03811615156114ce576040805160e560020a62461bcd02815260206004820152604860248201527f4167656e7420697320726571756972656420746f20626520616e206e6f6e2d6560448201527f6d7074792061646472657373207768656e2073657474696e672075706772616460648201527f65206167656e742e000000000000000000000000000000000000000000000000608482015290519081900360a40190fd5b6006546101009004600160a060020a0316331461156f576040805160e560020a62461bcd02815260206004820152604e6024820152600080516020611f8583398151915260448201527f2074686520757067726164654d6173746572207768656e2073657474696e672060648201527f75706772616465206167656e742e000000000000000000000000000000000000608482015290519081900360a40190fd5b60036115796110b5565b600381111561158457fe5b1415611626576040805160e560020a62461bcd02815260206004820152604960248201527f5570677261646520737461746520697320726571756972656420746f206e6f7460448201527f20626520757067726164696e67207768656e2073657474696e6720757067726160648201527f6465206167656e742e0000000000000000000000000000000000000000000000608482015290519081900360a40190fd5b600754600160a060020a0316156116ad576040805160e560020a62461bcd02815260206004820152602660248201527f757067726164654167656e74206f6e6365207365742c2063616e6e6f7420626560448201527f2072657365740000000000000000000000000000000000000000000000000000606482015290519081900360840190fd5b6007805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a038381169190911791829055604080517f61d3d7a6000000000000000000000000000000000000000000000000000000008152905192909116916361d3d7a6916004808201926020929091908290030181600087803b15801561173157600080fd5b505af1158015611745573d6000803e3d6000fd5b505050506040513d602081101561175b57600080fd5b50511515611825576040805160e560020a62461bcd02815260206004820152607e60248201527f5468652070726f7669646564207570646174654167656e7420636f6e7472616360448201527f7420697320726571756972656420746f20626520636f6d706c69616e7420746f60648201527f2074686520557067726164654167656e7420696e74657266616365206d65746860848201527f6f64207768656e2073657474696e672075706772616465206167656e742e000060a482015290519081900360c40190fd5b600154600760009054906101000a9004600160a060020a0316600160a060020a0316634b2ba0dd6040518163ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401602060405180830381600087803b15801561189457600080fd5b505af11580156118a8573d6000803e3d6000fd5b505050506040513d60208110156118be57600080fd5b5051146118ff5760405160e560020a62461bcd028152600401808060200182810382526090815260200180611ef56090913960a00191505060405180910390fd5b60075460408051600160a060020a039092168252517f7845d5aa74cc410e35571258d954f23b82276e160fe8c188fa80566580f279cc9181900360200190a150565b600160a060020a03918216600090815260026020908152604080832093909416825291909152205490565b600f54600160a060020a031681565b600354600160a060020a0316331461199257600080fd5b61199b81611e38565b50565b600160a060020a0381161515611a4a576040805160e560020a62461bcd02815260206004820152605d60248201527f5468652070726f766964656420757067726164654d617374657220697320726560448201527f71756972656420746f2062652061206e6f6e2d656d707479206164647265737360648201527f207768656e2073657474696e672075706772616465206d61737465722e000000608482015290519081900360a40190fd5b6006546101009004600160a060020a03163314611aeb576040805160e560020a62461bcd02815260206004820152605e6024820152600080516020611f8583398151915260448201527f20746865206f726967696e616c20757067726164654d6173746572207768656e60648201527f2073657474696e6720286e6577292075706772616465206d61737465722e0000608482015290519081900360a40190fd5b60068054600160a060020a039092166101000274ffffffffffffffffffffffffffffffffffffffff0019909216919091179055565b600082821115611b2c57fe5b50900390565b600160a060020a038316600090815260208190526040812054821115611b5757600080fd5b600160a060020a0384166000908152600260209081526040808320338452909152902054821115611b8757600080fd5b600160a060020a0383161515611b9c57600080fd5b600160a060020a038416600090815260208190526040902054611bc5908363ffffffff611b2016565b600160a060020a038086166000908152602081905260408082209390935590851681522054611bfa908363ffffffff611ca716565b600160a060020a03808516600090815260208181526040808320949094559187168152600282528281203382529091522054611c3c908363ffffffff611b2016565b600160a060020a03808616600081815260026020908152604080832033845282529182902094909455805186815290519287169391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef929181900390910190a35060019392505050565b8181018281101561086857fe5b600454600160a060020a03163314611d2a576040805160e560020a62461bcd0281526020600482015260316024820152600080516020611f8583398151915260448201527f20612072656c65617365206167656e742e000000000000000000000000000000606482015290519081900360840190fd5b6004805474ff0000000000000000000000000000000000000000191660a060020a179055565b60095460ff1690565b33600090815260208190526040812054821115611d7557600080fd5b600160a060020a0383161515611d8a57600080fd5b33600090815260208190526040902054611daa908363ffffffff611b2016565b3360009081526020819052604080822092909255600160a060020a03851681522054611ddc908363ffffffff611ca716565b600160a060020a038416600081815260208181526040918290209390935580518581529051919233927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a350600192915050565b600160a060020a0381161515611e4d57600080fd5b600354604051600160a060020a038084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a36003805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0392909216919091179055565b6000821515611ec757506000610868565b50818102818382811515611ed757fe5b041461086857fe5b60008183811515611eec57fe5b04939250505056005468652070726f766964656420757067726164654167656e7420636f6e74726163742773206f726967696e616c537570706c7920697320726571756972656420746f206265206571756976616c656e7420746f206578697374696e6720636f6e7472616374277320746f74616c537570706c795f207768656e2073657474696e672075706772616465206167656e742e4d6573736167652073656e64657220697320726571756972656420746f206265a165627a7a72305820b1e04321bb9e830b1d8318c500afb2b83bdfb0cdeed898227da51bf1bbc4146700290000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000014bddab3e51a57cff87a5000000000000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000000000001000000000000000000000000fbfeaf0da0f2fde5c66df570133ae35f3eb58c9a000000000000000000000000fbfeaf0da0f2fde5c66df570133ae35f3eb58c9a000000000000000000000000fbfeaf0da0f2fde5c66df570133ae35f3eb58c9a000000000000000000000000fbfeaf0da0f2fde5c66df570133ae35f3eb58c9a000000000000000000000000fbfeaf0da0f2fde5c66df570133ae35f3eb58c9a000000000000000000000000000000000000000000000000000000000000000378517400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006696a6a6176420000000000000000000000000000000000000000000000000000",
    "contractAddress": "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    "cumulativeGasUsed": "6190821",
    "gasUsed": "1173624",
    "confirmations": "2766025",
    "methodId": "0x60806040",
    "functionName": "atInversebrah(int248 a, uint48[] b, uint32 c, bytes20[] d, bytes30[] e)",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "17047551",
    "hash": "0x92fd1705b8b32e1a9cf1c80323d1b43a9b3e37d9c9b5046440f89048921d6277_0",
    "transactionIndex": 13,
    "from": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "to": "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    "value": "0",
    "gas": "150552",
    "isError": "0",
    "input": "0x70a082310000000000000000000000008e5ca1872062bee63b8a46493f6de36d4870ff88",
    "methodId": "0x70a08231",
    "trace_address": [
      2
    ],
    "isInternal": true
  }
]
const assertions = {
  "0x2afae7763487e60b893cb57803694810e6d3d136186a6de6719921afd7ca304a": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ],
  "0x92fd1705b8b32e1a9cf1c80323d1b43a9b3e37d9c9b5046440f89048921d6277_0": [
    {
      "method": "equal",
      "args": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  ]
}
