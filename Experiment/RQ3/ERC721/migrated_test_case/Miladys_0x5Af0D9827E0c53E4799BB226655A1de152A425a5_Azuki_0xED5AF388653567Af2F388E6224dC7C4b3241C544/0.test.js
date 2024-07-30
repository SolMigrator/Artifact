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
    "blockNumber": "13090020",
    "timeStamp": "1629833773",
    "hash": "0x9edf479817c9a204db9aa2756c069196910509b94f08be4d526cddee4851e10d",
    "nonce": "121",
    "blockHash": "0x97e8531aa1dd1765f0d947fcfa3663734eec0f7560decee51938b93e0b4612f9",
    "transactionIndex": "149",
    "from": "0x00859b3baac525143bb8a3ee3e19ddf9daf2408c",
    "to": "",
    "value": "0",
    "gas": "2691112",
    "gasPrice": "69685073549",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x610120604052600060015560006008553480156200001c57600080fd5b5060405162003bbf38038062003bbf8339810160408190526200003f9162000308565b60405180604001604052806005815260200164417a756b6960d81b81525060405180604001604052806005815260200164415a554b4960d81b815250858562000097620000916200020e60201b60201c565b62000212565b60008111620001045760405162461bcd60e51b815260206004820152602e60248201527f455243373231413a20636f6c6c656374696f6e206d757374206861766520612060448201526d6e6f6e7a65726f20737570706c7960901b60648201526084015b60405180910390fd5b60008211620001665760405162461bcd60e51b815260206004820152602760248201527f455243373231413a206d61782062617463682073697a65206d757374206265206044820152666e6f6e7a65726f60c81b6064820152608401620000fb565b83516200017b90600290602087019062000262565b5082516200019190600390602086019062000262565b5060a0919091526080525050600160095560c084905261010082905260e081905282821115620002045760405162461bcd60e51b815260206004820152601d60248201527f6c617267657220636f6c6c656374696f6e2073697a65206e65656465640000006044820152606401620000fb565b505050506200037b565b3390565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b82805462000270906200033e565b90600052602060002090601f016020900481019282620002945760008555620002df565b82601f10620002af57805160ff1916838001178555620002df565b82800160010185558215620002df579182015b82811115620002df578251825591602001919060010190620002c2565b50620002ed929150620002f1565b5090565b5b80821115620002ed5760008155600101620002f2565b600080600080608085870312156200031e578384fd5b505082516020840151604085015160609095015191969095509092509050565b600181811c908216806200035357607f821691505b602082108114156200037557634e487b7160e01b600052602260045260246000fd5b50919050565b60805160a05160c05160e051610100516137ab62000414600039600081816104e401526113ad0152600081816108fe0152610f6c0152600081816105d4015281816114670152611f2701526000818161100201528181611090015281816110c80152818161279d015281816127c70152612d3101526000818161120c01528181611eaf015281816124f6015261252801526137ab6000f3fe6080604052600436106102c25760003560e01c8063715018a61161017f578063ac446002116100e1578063d7224ba01161008a578063f2fde38b11610064578063f2fde38b146108b6578063f8a987d8146108d6578063fbe1aa51146108ec57600080fd5b8063d7224ba014610837578063dc33e6811461084d578063e985e9c51461086d57600080fd5b8063c87b56dd116100bb578063c87b56dd146107e8578063caf8a6d114610808578063cb91d8b31461082457600080fd5b8063ac44600214610793578063b05863d5146107a8578063b88d4fde146107c857600080fd5b806390aa0b0f1161014357806395d89b411161011d57806395d89b4114610731578063a22cb46514610746578063a7cd52cb1461076657600080fd5b806390aa0b0f14610634578063917d009e146106c35780639231ab2a146106e357600080fd5b8063715018a6146105915780637a1c4a56146105a65780638bc35c2f146105c25780638da5cb5b146105f6578063900280831461061457600080fd5b8063422030ba116102285780635666c880116101ec5780636352211e116101c65780636352211e146105315780636ebc56011461055157806370a082311461057157600080fd5b80635666c880146104d257806359f369fe146105065780635cae01d31461051b57600080fd5b8063422030ba1461043f57806342842e0e1461045f5780634d3554c31461047f5780634f6ccce71461049257806355f804b3146104b257600080fd5b806318160ddd1161028a5780632f745c59116102645780632f745c59146103f7578063375a069a1461041757806341fbddbd1461043757600080fd5b806318160ddd1461039857806323b872dd146103b75780632d20fb60146103d757600080fd5b806301ffc9a7146102c757806306fdde03146102fc578063081812fc1461031e578063095ea7b31461035657806316e6e15a14610378575b600080fd5b3480156102d357600080fd5b506102e76102e2366004613340565b610920565b60405190151581526020015b60405180910390f35b34801561030857600080fd5b5061031161098d565b6040516102f3919061353c565b34801561032a57600080fd5b5061033e6103393660046133e5565b610a1f565b6040516001600160a01b0390911681526020016102f3565b34801561036257600080fd5b50610376610371366004613256565b610aaf565b005b34801561038457600080fd5b50610376610393366004613463565b610bc7565b3480156103a457600080fd5b506001545b6040519081526020016102f3565b3480156103c357600080fd5b506103766103d2366004613129565b610cde565b3480156103e357600080fd5b506103766103f23660046133e5565b610ce9565b34801561040357600080fd5b506103a9610412366004613256565b610d9a565b34801561042357600080fd5b506103766104323660046133e5565b610f22565b6103766110fe565b34801561044b57600080fd5b506102e761045a36600461341e565b6112b9565b34801561046b57600080fd5b5061037661047a366004613129565b6112dd565b61037661048d3660046133e5565b6112f8565b34801561049e57600080fd5b506103a96104ad3660046133e5565b611513565b3480156104be57600080fd5b506103766104cd366004613378565b61157c565b3480156104de57600080fd5b506103a97f000000000000000000000000000000000000000000000000000000000000000081565b34801561051257600080fd5b506103a96115d0565b34801561052757600080fd5b506103a96104b081565b34801561053d57600080fd5b5061033e61054c3660046133e5565b611605565b34801561055d57600080fd5b5061037661056c366004613449565b611617565b34801561057d57600080fd5b506103a961058c3660046130dd565b61167b565b34801561059d57600080fd5b5061037661170c565b3480156105b257600080fd5b506103a9670de0b6b3a764000081565b3480156105ce57600080fd5b506103a97f000000000000000000000000000000000000000000000000000000000000000081565b34801561060257600080fd5b506000546001600160a01b031661033e565b34801561062057600080fd5b5061037661062f366004613449565b611760565b34801561064057600080fd5b50600a546106869063ffffffff80821691640100000000810482169167ffffffffffffffff600160401b8304811692600160801b810490911691600160c01b9091041685565b6040805163ffffffff9687168152948616602086015267ffffffffffffffff9384169085015291166060830152909116608082015260a0016102f3565b3480156106cf57600080fd5b506103a96106de3660046133e5565b6117ce565b3480156106ef57600080fd5b506107036106fe3660046133e5565b61187d565b6040805182516001600160a01b0316815260209283015167ffffffffffffffff1692810192909252016102f3565b34801561073d57600080fd5b5061031161189a565b34801561075257600080fd5b5061037661076136600461321c565b6118a9565b34801561077257600080fd5b506103a96107813660046130dd565b600b6020526000908152604090205481565b34801561079f57600080fd5b5061037661196e565b3480156107b457600080fd5b506103766107c336600461327f565b611aa6565b3480156107d457600080fd5b506103766107e3366004613164565b611be7565b3480156107f457600080fd5b506103116108033660046133e5565b611c6c565b34801561081457600080fd5b506103a9670214e8348c4f000081565b6103766108323660046133fd565b611d46565b34801561084357600080fd5b506103a960085481565b34801561085957600080fd5b506103a96108683660046130dd565b611fcc565b34801561087957600080fd5b506102e76108883660046130f7565b6001600160a01b03918216600090815260076020908152604080832093909416825291909152205460ff1690565b3480156108c257600080fd5b506103766108d13660046130dd565b611fd7565b3480156108e257600080fd5b506103a9614fb081565b3480156108f857600080fd5b506103a97f000000000000000000000000000000000000000000000000000000000000000081565b60006001600160e01b031982166380ac58cd60e01b148061095157506001600160e01b03198216635b5e139f60e01b145b8061096c57506001600160e01b0319821663780e9d6360e01b145b8061098757506301ffc9a760e01b6001600160e01b03198316145b92915050565b60606002805461099c90613693565b80601f01602080910402602001604051908101604052809291908181526020018280546109c890613693565b8015610a155780601f106109ea57610100808354040283529160200191610a15565b820191906000526020600020905b8154815290600101906020018083116109f857829003601f168201915b5050505050905090565b6000610a2c826001541190565b610a935760405162461bcd60e51b815260206004820152602d60248201527f455243373231413a20617070726f76656420717565727920666f72206e6f6e6560448201526c3c34b9ba32b73a103a37b5b2b760991b60648201526084015b60405180910390fd5b506000908152600660205260409020546001600160a01b031690565b6000610aba82611605565b9050806001600160a01b0316836001600160a01b03161415610b295760405162461bcd60e51b815260206004820152602260248201527f455243373231413a20617070726f76616c20746f2063757272656e74206f776e60448201526132b960f11b6064820152608401610a8a565b336001600160a01b0382161480610b455750610b458133610888565b610bb75760405162461bcd60e51b815260206004820152603960248201527f455243373231413a20617070726f76652063616c6c6572206973206e6f74206f60448201527f776e6572206e6f7220617070726f76656420666f7220616c6c000000000000006064820152608401610a8a565b610bc283838361208d565b505050565b6000546001600160a01b03163314610c0f5760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b6040805160a0810182526000815263ffffffff9283166020820181905267ffffffffffffffff9586169282018390529390941660608501819052600a8054600160c01b80820490951660809097018790526fffffffffffffffffffffffffffffffff19166401000000009095026fffffffffffffffff0000000000000000191694909417600160401b909202919091177fffffffff000000000000000000000000ffffffffffffffffffffffffffffffff16600160801b90910263ffffffff60c01b1916179202919091179055565b610bc28383836120f6565b6000546001600160a01b03163314610d315760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b60026009541415610d845760405162461bcd60e51b815260206004820152601f60248201527f5265656e7472616e637947756172643a207265656e7472616e742063616c6c006044820152606401610a8a565b6002600955610d9281612485565b506001600955565b6000610da58361167b565b8210610dfe5760405162461bcd60e51b815260206004820152602260248201527f455243373231413a206f776e657220696e646578206f7574206f6620626f756e604482015261647360f01b6064820152608401610a8a565b6000610e0960015490565b905060008060005b83811015610eb3576000818152600460209081526040918290208251808401909352546001600160a01b038116808452600160a01b90910467ffffffffffffffff169183019190915215610e6457805192505b876001600160a01b0316836001600160a01b03161415610ea05786841415610e925750935061098792505050565b83610e9c816136ce565b9450505b5080610eab816136ce565b915050610e11565b5060405162461bcd60e51b815260206004820152602e60248201527f455243373231413a20756e61626c6520746f2067657420746f6b656e206f662060448201527f6f776e657220627920696e6465780000000000000000000000000000000000006064820152608401610a8a565b6000546001600160a01b03163314610f6a5760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b7f000000000000000000000000000000000000000000000000000000000000000081610f9560015490565b610f9f91906135c6565b1115610ffd5760405162461bcd60e51b815260206004820152602760248201527f746f6f206d616e7920616c7265616479206d696e746564206265666f72652064604482015266195d881b5a5b9d60ca1b6064820152608401610a8a565b6110277f0000000000000000000000000000000000000000000000000000000000000000826136e9565b156110895760405162461bcd60e51b815260206004820152602c60248201527f63616e206f6e6c79206d696e742061206d756c7469706c65206f66207468652060448201526b6d6178426174636853697a6560a01b6064820152608401610a8a565b60006110b57f0000000000000000000000000000000000000000000000000000000000000000836135de565b905060005b81811015610bc2576110ec337f000000000000000000000000000000000000000000000000000000000000000061266f565b806110f6816136ce565b9150506110ba565b32331461114d5760405162461bcd60e51b815260206004820152601e60248201527f5468652063616c6c657220697320616e6f7468657220636f6e747261637400006044820152606401610a8a565b600a54600160401b900467ffffffffffffffff16806111ae5760405162461bcd60e51b815260206004820181905260248201527f616c6c6f776c6973742073616c6520686173206e6f7420626567756e207965746044820152606401610a8a565b336000908152600b602052604090205461120a5760405162461bcd60e51b815260206004820152601f60248201527f6e6f7420656c696769626c6520666f7220616c6c6f776c697374206d696e74006044820152606401610a8a565b7f000000000000000000000000000000000000000000000000000000000000000061123460015490565b61123f9060016135c6565b11156112825760405162461bcd60e51b815260206004820152601260248201527172656163686564206d617820737570706c7960701b6044820152606401610a8a565b336000908152600b6020526040812080549161129d8361367c565b91905055506112ad33600161266f565b6112b68161268d565b50565b600083158015906112c957508215155b80156112d55750814210155b949350505050565b610bc283838360405180602001604052806000815250611be7565b3233146113475760405162461bcd60e51b815260206004820152601e60248201527f5468652063616c6c657220697320616e6f7468657220636f6e747261637400006044820152606401610a8a565b600a5463ffffffff16801580159061135f5750804210155b6113ab5760405162461bcd60e51b815260206004820152601860248201527f73616c6520686173206e6f7420737461727465642079657400000000000000006044820152606401610a8a565b7f0000000000000000000000000000000000000000000000000000000000000000826113d660015490565b6113e091906135c6565b11156114655760405162461bcd60e51b815260206004820152604860248201527f6e6f7420656e6f7567682072656d61696e696e6720726573657276656420666f60448201527f722061756374696f6e20746f20737570706f72742064657369726564206d696e6064820152671d08185b5bdd5b9d60c21b608482015260a401610a8a565b7f00000000000000000000000000000000000000000000000000000000000000008261149033611fcc565b61149a91906135c6565b11156114e85760405162461bcd60e51b815260206004820152601660248201527f63616e206e6f74206d696e742074686973206d616e79000000000000000000006044820152606401610a8a565b6000826114f4836117ce565b6114fe91906135f2565b905061150a338461266f565b610bc28161268d565b600061151e60015490565b82106115785760405162461bcd60e51b815260206004820152602360248201527f455243373231413a20676c6f62616c20696e646578206f7574206f6620626f756044820152626e647360e81b6064820152608401610a8a565b5090565b6000546001600160a01b031633146115c45760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b610bc2600c8383612f9b565b6115de6104b0614fb06135de565b6115f8670214e8348c4f0000670de0b6b3a7640000613639565b61160291906135de565b81565b60006116108261271b565b5192915050565b6000546001600160a01b0316331461165f5760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b600a805463ffffffff191663ffffffff92909216919091179055565b60006001600160a01b0382166116e75760405162461bcd60e51b815260206004820152602b60248201527f455243373231413a2062616c616e636520717565727920666f7220746865207a60448201526a65726f206164647265737360a81b6064820152608401610a8a565b506001600160a01b03166000908152600560205260409020546001600160801b031690565b6000546001600160a01b031633146117545760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b61175e60006128d3565b565b6000546001600160a01b031633146117a85760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b600a805463ffffffff909216600160c01b0263ffffffff60c01b19909216919091179055565b6000814210156117e75750670de0b6b3a7640000919050565b614fb06117f48342613639565b106118085750670214e8348c4f0000919050565b60006104b06118178442613639565b61182191906135de565b90506118316104b0614fb06135de565b61184b670214e8348c4f0000670de0b6b3a7640000613639565b61185591906135de565b61185f90826135f2565b61187190670de0b6b3a7640000613639565b9392505050565b919050565b60408051808201909152600080825260208201526109878261271b565b60606003805461099c90613693565b6001600160a01b0382163314156119025760405162461bcd60e51b815260206004820152601a60248201527f455243373231413a20617070726f766520746f2063616c6c65720000000000006044820152606401610a8a565b3360008181526007602090815260408083206001600160a01b03871680855290835292819020805460ff191686151590811790915590519081529192917f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a35050565b6000546001600160a01b031633146119b65760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b60026009541415611a095760405162461bcd60e51b815260206004820152601f60248201527f5265656e7472616e637947756172643a207265656e7472616e742063616c6c006044820152606401610a8a565b6002600955604051600090339047908381818185875af1925050503d8060008114611a50576040519150601f19603f3d011682016040523d82523d6000602084013e611a55565b606091505b5050905080610d925760405162461bcd60e51b815260206004820152601060248201527f5472616e73666572206661696c65642e000000000000000000000000000000006044820152606401610a8a565b6000546001600160a01b03163314611aee5760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b8051825114611b505760405162461bcd60e51b815260206004820152602860248201527f61646472657373657320646f6573206e6f74206d61746368206e756d536c6f746044820152670e640d8cadccee8d60c31b6064820152608401610a8a565b60005b8251811015610bc257818181518110611b7c57634e487b7160e01b600052603260045260246000fd5b6020026020010151600b6000858481518110611ba857634e487b7160e01b600052603260045260246000fd5b60200260200101516001600160a01b03166001600160a01b03168152602001908152602001600020819055508080611bdf906136ce565b915050611b53565b611bf28484846120f6565b611bfe84848484612930565b611c665760405162461bcd60e51b815260206004820152603360248201527f455243373231413a207472616e7366657220746f206e6f6e204552433732315260448201527232b1b2b4bb32b91034b6b83632b6b2b73a32b960691b6064820152608401610a8a565b50505050565b6060611c79826001541190565b611ceb5760405162461bcd60e51b815260206004820152602f60248201527f4552433732314d657461646174613a2055524920717565727920666f72206e6f60448201527f6e6578697374656e7420746f6b656e00000000000000000000000000000000006064820152608401610a8a565b6000611cf5612a89565b90506000815111611d155760405180602001604052806000815250611871565b80611d1f84612a98565b604051602001611d309291906134d1565b6040516020818303038152906040529392505050565b323314611d955760405162461bcd60e51b815260206004820152601e60248201527f5468652063616c6c657220697320616e6f7468657220636f6e747261637400006044820152606401610a8a565b6040805160a081018252600a5463ffffffff8082168352640100000000820481166020840181905267ffffffffffffffff600160401b8404811695850195909552600160801b830490941660608401819052600160c01b90920416608083018190529192848314611e565760405162461bcd60e51b815260206004820152602560248201527f63616c6c6564207769746820696e636f7272656374207075626c69632073616c60448201526465206b657960d81b6064820152608401610a8a565b611e618284836112b9565b611ead5760405162461bcd60e51b815260206004820152601d60248201527f7075626c69632073616c6520686173206e6f7420626567756e207965740000006044820152606401610a8a565b7f000000000000000000000000000000000000000000000000000000000000000086611ed860015490565b611ee291906135c6565b1115611f255760405162461bcd60e51b815260206004820152601260248201527172656163686564206d617820737570706c7960701b6044820152606401610a8a565b7f000000000000000000000000000000000000000000000000000000000000000086611f5033611fcc565b611f5a91906135c6565b1115611fa85760405162461bcd60e51b815260206004820152601660248201527f63616e206e6f74206d696e742074686973206d616e79000000000000000000006044820152606401610a8a565b611fb2338761266f565b611fc4611fbf87846135f2565b61268d565b505050505050565b600061098782612bca565b6000546001600160a01b0316331461201f5760405162461bcd60e51b815260206004820181905260248201526000805160206137568339815191526044820152606401610a8a565b6001600160a01b0381166120845760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b6064820152608401610a8a565b6112b6816128d3565b600082815260066020526040808220805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0387811691821790925591518593918516917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591a4505050565b60006121018261271b565b80519091506000906001600160a01b0316336001600160a01b0316148061213857503361212d84610a1f565b6001600160a01b0316145b8061214a5750815161214a9033610888565b9050806121bf5760405162461bcd60e51b815260206004820152603260248201527f455243373231413a207472616e736665722063616c6c6572206973206e6f742060448201527f6f776e6572206e6f7220617070726f76656400000000000000000000000000006064820152608401610a8a565b846001600160a01b031682600001516001600160a01b0316146122335760405162461bcd60e51b815260206004820152602660248201527f455243373231413a207472616e736665722066726f6d20696e636f72726563746044820152651037bbb732b960d11b6064820152608401610a8a565b6001600160a01b0384166122975760405162461bcd60e51b815260206004820152602560248201527f455243373231413a207472616e7366657220746f20746865207a65726f206164604482015264647265737360d81b6064820152608401610a8a565b6122a7600084846000015161208d565b6001600160a01b03851660009081526005602052604081208054600192906122d99084906001600160801b0316613611565b82546101009290920a6001600160801b038181021990931691831602179091556001600160a01b03861660009081526005602052604081208054600194509092612325918591166135a4565b82546001600160801b039182166101009390930a9283029190920219909116179055506040805180820182526001600160a01b03808716825267ffffffffffffffff428116602080850191825260008981526004909152948520935184549151909216600160a01b026001600160e01b031990911691909216171790556123ad8460016135c6565b6000818152600460205260409020549091506001600160a01b031661243f576123d7816001541190565b1561243f5760408051808201825284516001600160a01b03908116825260208087015167ffffffffffffffff9081168285019081526000878152600490935294909120925183549451909116600160a01b026001600160e01b03199094169116179190911790555b83856001600160a01b0316876001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a4611fc4565b600854816124d55760405162461bcd60e51b815260206004820152601860248201527f7175616e74697479206d757374206265206e6f6e7a65726f00000000000000006044820152606401610a8a565b600060016124e384846135c6565b6124ed9190613639565b905061251a60017f0000000000000000000000000000000000000000000000000000000000000000613639565b81111561254f5761254c60017f0000000000000000000000000000000000000000000000000000000000000000613639565b90505b61255a816001541190565b6125b55760405162461bcd60e51b815260206004820152602660248201527f6e6f7420656e6f756768206d696e7465642079657420666f722074686973206360448201526506c65616e75760d41b6064820152608401610a8a565b815b81811161265b576000818152600460205260409020546001600160a01b03166126495760006125e58261271b565b60408051808201825282516001600160a01b03908116825260209384015167ffffffffffffffff9081168584019081526000888152600490965293909420915182549351909416600160a01b026001600160e01b0319909316931692909217179055505b80612653816136ce565b9150506125b7565b506126678160016135c6565b600855505050565b612689828260405180602001604052806000815250612c74565b5050565b803410156126dd5760405162461bcd60e51b815260206004820152601660248201527f4e65656420746f2073656e64206d6f7265204554482e000000000000000000006044820152606401610a8a565b803411156112b657336108fc6126f38334613639565b6040518115909202916000818181858888f19350505050158015612689573d6000803e3d6000fd5b604080518082019091526000808252602082015261273a826001541190565b6127995760405162461bcd60e51b815260206004820152602a60248201527f455243373231413a206f776e657220717565727920666f72206e6f6e657869736044820152693a32b73a103a37b5b2b760b11b6064820152608401610a8a565b60007f000000000000000000000000000000000000000000000000000000000000000083106127fa576127ec7f000000000000000000000000000000000000000000000000000000000000000084613639565b6127f79060016135c6565b90505b825b818110612864576000818152600460209081526040918290208251808401909352546001600160a01b038116808452600160a01b90910467ffffffffffffffff16918301919091521561285157949350505050565b508061285c8161367c565b9150506127fc565b5060405162461bcd60e51b815260206004820152602f60248201527f455243373231413a20756e61626c6520746f2064657465726d696e652074686560448201527f206f776e6572206f6620746f6b656e00000000000000000000000000000000006064820152608401610a8a565b600080546001600160a01b0383811673ffffffffffffffffffffffffffffffffffffffff19831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b60006001600160a01b0384163b15612a7e57604051630a85bd0160e11b81526001600160a01b0385169063150b7a0290612974903390899088908890600401613500565b602060405180830381600087803b15801561298e57600080fd5b505af19250505080156129be575060408051601f3d908101601f191682019092526129bb9181019061335c565b60015b612a64573d8080156129ec576040519150601f19603f3d011682016040523d82523d6000602084013e6129f1565b606091505b508051612a5c5760405162461bcd60e51b815260206004820152603360248201527f455243373231413a207472616e7366657220746f206e6f6e204552433732315260448201527232b1b2b4bb32b91034b6b83632b6b2b73a32b960691b6064820152608401610a8a565b805181602001fd5b6001600160e01b031916630a85bd0160e11b1490506112d5565b506001949350505050565b6060600c805461099c90613693565b606081612abc5750506040805180820190915260018152600360fc1b602082015290565b8160005b8115612ae65780612ad0816136ce565b9150612adf9050600a836135de565b9150612ac0565b60008167ffffffffffffffff811115612b0f57634e487b7160e01b600052604160045260246000fd5b6040519080825280601f01601f191660200182016040528015612b39576020820181803683370190505b5090505b84156112d557612b4e600183613639565b9150612b5b600a866136e9565b612b669060306135c6565b60f81b818381518110612b8957634e487b7160e01b600052603260045260246000fd5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a905350612bc3600a866135de565b9450612b3d565b60006001600160a01b038216612c485760405162461bcd60e51b815260206004820152603160248201527f455243373231413a206e756d626572206d696e74656420717565727920666f7260448201527f20746865207a65726f20616464726573730000000000000000000000000000006064820152608401610a8a565b506001600160a01b0316600090815260056020526040902054600160801b90046001600160801b031690565b6001546001600160a01b038416612cd75760405162461bcd60e51b815260206004820152602160248201527f455243373231413a206d696e7420746f20746865207a65726f206164647265736044820152607360f81b6064820152608401610a8a565b612ce2816001541190565b15612d2f5760405162461bcd60e51b815260206004820152601d60248201527f455243373231413a20746f6b656e20616c7265616479206d696e7465640000006044820152606401610a8a565b7f0000000000000000000000000000000000000000000000000000000000000000831115612daa5760405162461bcd60e51b815260206004820152602260248201527f455243373231413a207175616e7469747920746f206d696e7420746f6f2068696044820152610ced60f31b6064820152608401610a8a565b6001600160a01b0384166000908152600560209081526040918290208251808401845290546001600160801b038082168352600160801b9091041691810191909152815180830190925280519091908190612e069087906135a4565b6001600160801b03168152602001858360200151612e2491906135a4565b6001600160801b039081169091526001600160a01b0380881660008181526005602090815260408083208751978301518716600160801b0297909616969096179094558451808601865291825267ffffffffffffffff4281168386019081528883526004909552948120915182549451909516600160a01b026001600160e01b031990941694909216939093179190911790915582905b85811015612f905760405182906001600160a01b038916906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908290a4612f086000888488612930565b612f705760405162461bcd60e51b815260206004820152603360248201527f455243373231413a207472616e7366657220746f206e6f6e204552433732315260448201527232b1b2b4bb32b91034b6b83632b6b2b73a32b960691b6064820152608401610a8a565b81612f7a816136ce565b9250508080612f88906136ce565b915050612ebb565b506001819055611fc4565b828054612fa790613693565b90600052602060002090601f016020900481019282612fc9576000855561300f565b82601f10612fe25782800160ff1982351617855561300f565b8280016001018555821561300f579182015b8281111561300f578235825591602001919060010190612ff4565b506115789291505b808211156115785760008155600101613017565b80356001600160a01b038116811461187857600080fd5b600082601f830112613052578081fd5b8135602061306761306283613580565b61354f565b80838252828201915082860187848660051b8901011115613086578586fd5b855b858110156130a457813584529284019290840190600101613088565b5090979650505050505050565b803563ffffffff8116811461187857600080fd5b803567ffffffffffffffff8116811461187857600080fd5b6000602082840312156130ee578081fd5b6118718261302b565b60008060408385031215613109578081fd5b6131128361302b565b91506131206020840161302b565b90509250929050565b60008060006060848603121561313d578081fd5b6131468461302b565b92506131546020850161302b565b9150604084013590509250925092565b60008060008060808587031215613179578081fd5b6131828561302b565b9350602061319181870161302b565b935060408601359250606086013567ffffffffffffffff808211156131b4578384fd5b818801915088601f8301126131c7578384fd5b8135818111156131d9576131d9613729565b6131eb601f8201601f1916850161354f565b91508082528984828501011115613200578485fd5b8084840185840137810190920192909252939692955090935050565b6000806040838503121561322e578182fd5b6132378361302b565b91506020830135801515811461324b578182fd5b809150509250929050565b60008060408385031215613268578182fd5b6132718361302b565b946020939093013593505050565b60008060408385031215613291578182fd5b823567ffffffffffffffff808211156132a8578384fd5b818501915085601f8301126132bb578384fd5b813560206132cb61306283613580565b8083825282820191508286018a848660051b89010111156132ea578889fd5b8896505b84871015613313576132ff8161302b565b8352600196909601959183019183016132ee565b5096505086013592505080821115613329578283fd5b5061333685828601613042565b9150509250929050565b600060208284031215613351578081fd5b81356118718161373f565b60006020828403121561336d578081fd5b81516118718161373f565b6000806020838503121561338a578081fd5b823567ffffffffffffffff808211156133a1578283fd5b818501915085601f8301126133b4578283fd5b8135818111156133c2578384fd5b8660208285010111156133d3578384fd5b60209290920196919550909350505050565b6000602082840312156133f6578081fd5b5035919050565b6000806040838503121561340f578182fd5b50508035926020909101359150565b600080600060608486031215613432578081fd5b505081359360208301359350604090920135919050565b60006020828403121561345a578081fd5b611871826130b1565b600080600060608486031215613477578081fd5b613480846130c5565b925061348e602085016130c5565b915061349c604085016130b1565b90509250925092565b600081518084526134bd816020860160208601613650565b601f01601f19169290920160200192915050565b600083516134e3818460208801613650565b8351908301906134f7818360208801613650565b01949350505050565b60006001600160a01b0380871683528086166020840152508360408301526080606083015261353260808301846134a5565b9695505050505050565b60208152600061187160208301846134a5565b604051601f8201601f1916810167ffffffffffffffff8111828210171561357857613578613729565b604052919050565b600067ffffffffffffffff82111561359a5761359a613729565b5060051b60200190565b60006001600160801b038083168185168083038211156134f7576134f76136fd565b600082198211156135d9576135d96136fd565b500190565b6000826135ed576135ed613713565b500490565b600081600019048311821515161561360c5761360c6136fd565b500290565b60006001600160801b0383811690831681811015613631576136316136fd565b039392505050565b60008282101561364b5761364b6136fd565b500390565b60005b8381101561366b578181015183820152602001613653565b83811115611c665750506000910152565b60008161368b5761368b6136fd565b506000190190565b600181811c908216806136a757607f821691505b602082108114156136c857634e487b7160e01b600052602260045260246000fd5b50919050565b60006000198214156136e2576136e26136fd565b5060010190565b6000826136f8576136f8613713565b500690565b634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052601260045260246000fd5b634e487b7160e01b600052604160045260246000fd5b6001600160e01b0319811681146112b657600080fdfe4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572a2646970667358221220297815852a990d34134cfe95f3d2af037c752891552ebd0f502c2a7b09e2a26c64736f6c634300080400330000000000000000000000000000000001f0f9dc19c89f6302d4eccdc00000000000000000000000000000000000000005245b08037433ab46e119b9400000000000000000000000000000000000000001f75cd2c3ad7e59a34b496a000000000000000000000000000000000000000000ecde6815baae4d3e23f92340000000",
    "contractAddress": "0x5af0d9827e0c53e4799bb226655a1de152a425a5",
    "cumulativeGasUsed": "22421676",
    "gasUsed": "2691112",
    "confirmations": "6721051",
    "methodId": "0x60a06040",
    "functionName": "",
    "trace_address": [
      -1
    ]
  }
]
const assertions = {
  "0x9edf479817c9a204db9aa2756c069196910509b94f08be4d526cddee4851e10d": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ]
}
