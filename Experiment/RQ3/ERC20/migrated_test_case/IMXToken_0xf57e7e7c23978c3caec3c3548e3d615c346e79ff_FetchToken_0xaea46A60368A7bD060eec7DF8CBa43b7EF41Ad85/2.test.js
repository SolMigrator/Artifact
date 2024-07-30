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
    "blockNumber": "13415141",
    "timeStamp": "1634198360",
    "hash": "0xafe9777c91eb0ca07c0e2455ff739ba02758e896684346b98f3892717fd91d9c",
    "nonce": "0",
    "blockHash": "0x2319dd564c8077498d085cb81ad0a8753d4e22a1005ef15072b0078688dcf8d9",
    "transactionIndex": "187",
    "from": "0xe9df50db94a4c0b75d0df9a768a37a935c201d05",
    "to": "",
    "value": "0",
    "gas": "1067948",
    "gasPrice": "95000000000",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x60806040523480156200001157600080fd5b5060405162001ff238038062001ff2833981810160405260608110156200003757600080fd5b81019080805160405193929190846401000000008211156200005857600080fd5b9083019060208201858111156200006e57600080fd5b82516401000000008111828201881017156200008957600080fd5b82525081516020918201929091019080838360005b83811015620000b85781810151838201526020016200009e565b50505050905090810190601f168015620000e65780820380516001836020036101000a031916815260200191505b50604052602001805160405193929190846401000000008211156200010a57600080fd5b9083019060208201858111156200012057600080fd5b82516401000000008111828201881017156200013b57600080fd5b82525081516020918201929091019080838360005b838110156200016a57818101518382015260200162000150565b50505050905090810190601f168015620001985780820380516001836020036101000a031916815260200191505b5060405260209081015185519093508592508491620001bd9160049185019062000668565b508051620001d390600590602084019062000668565b50506006805461ff001960ff1990911660121716905550620002126000620002036001600160e01b03620002d616565b6001600160e01b03620002db16565b604080517f4d494e5445525f524f4c450000000000000000000000000000000000000000008152905190819003600b0190206200025c90620002036001600160e01b03620002d616565b604080517f5041555345525f524f4c450000000000000000000000000000000000000000008152905190819003600b019020620002a690620002036001600160e01b03620002d616565b620002cd620002bd6001600160e01b03620002d616565b826001600160e01b03620002f416565b5050506200070a565b335b90565b620002f082826001600160e01b036200042a16565b5050565b6001600160a01b0382166200036a57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015290519081900360640190fd5b62000381600083836001600160e01b03620004ac16565b6200039d81600354620004c960201b62000fd71790919060201c565b6003556001600160a01b038216600090815260016020908152604090912054620003d291839062000fd7620004c9821b17901c565b6001600160a01b03831660008181526001602090815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b6000828152602081815260409091206200044f9183906200139a62000547821b17901c565b15620002f057620004686001600160e01b03620002d616565b6001600160a01b0316816001600160a01b0316837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45050565b620004c48383836200056760201b620014861760201c565b505050565b6000828201838110156200053e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b90505b92915050565b60006200053e836001600160a01b0384166001600160e01b03620005ea16565b6200057f838383620004c460201b620009891760201c565b620005926001600160e01b036200064216565b15620004c4576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602a81526020018062001fc8602a913960400191505060405180910390fd5b60006200060183836001600160e01b036200065016565b620006395750815460018181018455600084815260208082209093018490558454848252828601909352604090209190915562000541565b50600062000541565b600654610100900460ff1690565b60009081526001919091016020526040902054151590565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620006ab57805160ff1916838001178555620006db565b82800160010185558215620006db579182015b82811115620006db578251825591602001919060010190620006be565b50620006e9929150620006ed565b5090565b620002d891905b80821115620006e95760008155600101620006f4565b6118ae806200071a6000396000f3fe608060405234801561001057600080fd5b50600436106101a95760003560e01c806370a08231116100f9578063a457c2d711610097578063d539139311610071578063d53913931461051f578063d547741f14610527578063dd62ed3e14610553578063e63ab1e914610581576101a9565b8063a457c2d7146104aa578063a9059cbb146104d6578063ca15c87314610502576101a9565b80639010d07c116100d35780639010d07c1461042f57806391d148541461046e57806395d89b411461049a578063a217fddf146104a2576101a9565b806370a08231146103d557806379cc6790146103fb5780638456cb5914610427576101a9565b8063313ce567116101665780633f4ba83a116101405780633f4ba83a1461037c57806340c10f191461038457806342966c68146103b05780635c975abb146103cd576101a9565b8063313ce5671461030657806336568abe146103245780633950935114610350576101a9565b806306fdde03146101ae578063095ea7b31461022b57806318160ddd1461026b57806323b872dd14610285578063248a9ca3146102bb5780632f2ff15d146102d8575b600080fd5b6101b6610589565b6040805160208082528351818301528351919283929083019185019080838360005b838110156101f05781810151838201526020016101d8565b50505050905090810190601f16801561021d5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6102576004803603604081101561024157600080fd5b506001600160a01b03813516906020013561061f565b604080519115158252519081900360200190f35b61027361063d565b60408051918252519081900360200190f35b6102576004803603606081101561029b57600080fd5b506001600160a01b03813581169160208101359091169060400135610643565b610273600480360360208110156102d157600080fd5b50356106d0565b610304600480360360408110156102ee57600080fd5b50803590602001356001600160a01b03166106e5565b005b61030e610751565b6040805160ff9092168252519081900360200190f35b6103046004803603604081101561033a57600080fd5b50803590602001356001600160a01b031661075a565b6102576004803603604081101561036657600080fd5b506001600160a01b0381351690602001356107bb565b61030461080f565b6103046004803603604081101561039a57600080fd5b506001600160a01b038135169060200135610880565b610304600480360360208110156103c657600080fd5b50356108f1565b610257610905565b610273600480360360208110156103eb57600080fd5b50356001600160a01b0316610913565b6103046004803603604081101561041157600080fd5b506001600160a01b03813516906020013561092e565b61030461098e565b6104526004803603604081101561044557600080fd5b50803590602001356109fd565b604080516001600160a01b039092168252519081900360200190f35b6102576004803603604081101561048457600080fd5b50803590602001356001600160a01b0316610a22565b6101b6610a40565b610273610aa1565b610257600480360360408110156104c057600080fd5b506001600160a01b038135169060200135610aa6565b610257600480360360408110156104ec57600080fd5b506001600160a01b038135169060200135610b14565b6102736004803603602081101561051857600080fd5b5035610b28565b610273610b3f565b6103046004803603604081101561053d57600080fd5b50803590602001356001600160a01b0316610b62565b6102736004803603604081101561056957600080fd5b506001600160a01b0381358116916020013516610bbb565b610273610be6565b60048054604080516020601f60026000196101006001881615020190951694909404938401819004810282018101909252828152606093909290918301828280156106155780601f106105ea57610100808354040283529160200191610615565b820191906000526020600020905b8154815290600101906020018083116105f857829003601f168201915b5050505050905090565b600061063361062c610c09565b8484610c0d565b5060015b92915050565b60035490565b6000610650848484610cf9565b6106c68461065c610c09565b6106c185604051806060016040528060288152602001611745602891396001600160a01b038a1660009081526002602052604081209061069a610c09565b6001600160a01b03168152602081019190915260400160002054919063ffffffff610e6216565b610c0d565b5060019392505050565b60009081526020819052604090206002015490565b60008281526020819052604090206002015461070890610703610c09565b610a22565b6107435760405162461bcd60e51b815260040180806020018281038252602f81526020018061162b602f913960400191505060405180910390fd5b61074d8282610ef9565b5050565b60065460ff1690565b610762610c09565b6001600160a01b0316816001600160a01b0316146107b15760405162461bcd60e51b815260040180806020018281038252602f815260200180611820602f913960400191505060405180910390fd5b61074d8282610f68565b60006106336107c8610c09565b846106c185600260006107d9610c09565b6001600160a01b03908116825260208083019390935260409182016000908120918c16815292529020549063ffffffff610fd716565b604080516a5041555345525f524f4c4560a81b8152905190819003600b01902061083b90610703610c09565b6108765760405162461bcd60e51b815260040180806020018281038252602d8152602001806116f4602d913960400191505060405180910390fd5b61087e611031565b565b604080516a4d494e5445525f524f4c4560a81b8152905190819003600b0190206108ac90610703610c09565b6108e75760405162461bcd60e51b81526004018080602001828103825260248152602001806117216024913960400191505060405180910390fd5b61074d82826110d5565b6109026108fc610c09565b826111d3565b50565b600654610100900460ff1690565b6001600160a01b031660009081526001602052604090205490565b600061096b8260405180606001604052806024815260200161176d6024913961095e86610959610c09565b610bbb565b919063ffffffff610e6216565b905061097f83610979610c09565b83610c0d565b61098983836111d3565b505050565b604080516a5041555345525f524f4c4560a81b8152905190819003600b0190206109ba90610703610c09565b6109f55760405162461bcd60e51b815260040180806020018281038252602d8152602001806116f4602d913960400191505060405180910390fd5b61087e6112db565b6000828152602081905260408120610a1b908363ffffffff61136316565b9392505050565b6000828152602081905260408120610a1b908363ffffffff61136f16565b60058054604080516020601f60026000196101006001881615020190951694909404938401819004810282018101909252828152606093909290918301828280156106155780601f106105ea57610100808354040283529160200191610615565b600081565b6000610633610ab3610c09565b846106c1856040518060600160405280602581526020016117fb6025913960026000610add610c09565b6001600160a01b03908116825260208083019390935260409182016000908120918d1681529252902054919063ffffffff610e6216565b6000610633610b21610c09565b8484610cf9565b600081815260208190526040812061063790611384565b604080516a4d494e5445525f524f4c4560a81b8152905190819003600b01902081565b600082815260208190526040902060020154610b8090610703610c09565b6107b15760405162461bcd60e51b81526004018080602001828103825260308152602001806116c46030913960400191505060405180910390fd5b6001600160a01b03918216600090815260026020908152604080832093909416825291909152205490565b604080516a5041555345525f524f4c4560a81b8152905190819003600b01902081565b3390565b6001600160a01b038316610c525760405162461bcd60e51b81526004018080602001828103825260248152602001806117d76024913960400191505060405180910390fd5b6001600160a01b038216610c975760405162461bcd60e51b815260040180806020018281038252602281526020018061167c6022913960400191505060405180910390fd5b6001600160a01b03808416600081815260026020908152604080832094871680845294825291829020859055815185815291517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a3505050565b6001600160a01b038316610d3e5760405162461bcd60e51b81526004018080602001828103825260258152602001806117b26025913960400191505060405180910390fd5b6001600160a01b038216610d835760405162461bcd60e51b81526004018080602001828103825260238152602001806116086023913960400191505060405180910390fd5b610d8e83838361138f565b610dd18160405180606001604052806026815260200161169e602691396001600160a01b038616600090815260016020526040902054919063ffffffff610e6216565b6001600160a01b038085166000908152600160205260408082209390935590841681522054610e06908263ffffffff610fd716565b6001600160a01b0380841660008181526001602090815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b60008184841115610ef15760405162461bcd60e51b81526004018080602001828103825283818151815260200191508051906020019080838360005b83811015610eb6578181015183820152602001610e9e565b50505050905090810190601f168015610ee35780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b505050900390565b6000828152602081905260409020610f17908263ffffffff61139a16565b1561074d57610f24610c09565b6001600160a01b0316816001600160a01b0316837f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45050565b6000828152602081905260409020610f86908263ffffffff6113af16565b1561074d57610f93610c09565b6001600160a01b0316816001600160a01b0316837ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a45050565b600082820183811015610a1b576040805162461bcd60e51b815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b600654610100900460ff16611084576040805162461bcd60e51b815260206004820152601460248201527314185d5cd8589b194e881b9bdd081c185d5cd95960621b604482015290519081900360640190fd5b6006805461ff00191690557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa6110b8610c09565b604080516001600160a01b039092168252519081900360200190a1565b6001600160a01b038216611130576040805162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015290519081900360640190fd5b61113c6000838361138f565b60035461114f908263ffffffff610fd716565b6003556001600160a01b03821660009081526001602052604090205461117b908263ffffffff610fd716565b6001600160a01b03831660008181526001602090815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b6001600160a01b0382166112185760405162461bcd60e51b81526004018080602001828103825260218152602001806117916021913960400191505060405180910390fd5b6112248260008361138f565b6112678160405180606001604052806022815260200161165a602291396001600160a01b038516600090815260016020526040902054919063ffffffff610e6216565b6001600160a01b038316600090815260016020526040902055600354611293908263ffffffff6113c416565b6003556040805182815290516000916001600160a01b038516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9181900360200190a35050565b600654610100900460ff161561132b576040805162461bcd60e51b815260206004820152601060248201526f14185d5cd8589b194e881c185d5cd95960821b604482015290519081900360640190fd5b6006805461ff0019166101001790557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586110b8610c09565b6000610a1b8383611406565b6000610a1b836001600160a01b03841661146a565b600061063782611482565b610989838383611486565b6000610a1b836001600160a01b0384166114d5565b6000610a1b836001600160a01b03841661151f565b6000610a1b83836040518060400160405280601e81526020017f536166654d6174683a207375627472616374696f6e206f766572666c6f770000815250610e62565b815460009082106114485760405162461bcd60e51b81526004018080602001828103825260228152602001806115e66022913960400191505060405180910390fd5b82600001828154811061145757fe5b9060005260206000200154905092915050565b60009081526001919091016020526040902054151590565b5490565b611491838383610989565b611499610905565b156109895760405162461bcd60e51b815260040180806020018281038252602a81526020018061184f602a913960400191505060405180910390fd5b60006114e1838361146a565b61151757508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610637565b506000610637565b600081815260018301602052604081205480156115db578354600019808301919081019060009087908390811061155257fe5b906000526020600020015490508087600001848154811061156f57fe5b60009182526020808320909101929092558281526001898101909252604090209084019055865487908061159f57fe5b60019003818190600052602060002001600090559055866001016000878152602001908152602001600020600090556001945050505050610637565b600091505061063756fe456e756d657261626c655365743a20696e646578206f7574206f6620626f756e647345524332303a207472616e7366657220746f20746865207a65726f2061646472657373416363657373436f6e74726f6c3a2073656e646572206d75737420626520616e2061646d696e20746f206772616e7445524332303a206275726e20616d6f756e7420657863656564732062616c616e636545524332303a20617070726f766520746f20746865207a65726f206164647265737345524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e6365416363657373436f6e74726f6c3a2073656e646572206d75737420626520616e2061646d696e20746f207265766f6b657369676e6572206d75737420686176652070617573657220726f6c6520746f2070617573652f756e70617573657369676e6572206d7573742068617665206d696e74657220726f6c6520746f206d696e7445524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e636545524332303a206275726e20616d6f756e74206578636565647320616c6c6f77616e636545524332303a206275726e2066726f6d20746865207a65726f206164647265737345524332303a207472616e736665722066726f6d20746865207a65726f206164647265737345524332303a20617070726f76652066726f6d20746865207a65726f206164647265737345524332303a2064656372656173656420616c6c6f77616e63652062656c6f77207a65726f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636520726f6c657320666f722073656c6645524332305061757361626c653a20746f6b656e207472616e73666572207768696c6520706175736564a26469706673582212201233663b57e4236efc6106bf651fd85b90c4f971dff97478542d6043557014cb64736f6c6343000602003345524332305061757361626c653a20746f6b656e207472616e73666572207768696c6520706175736564000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000004a13388907c7d8b802d5b71400000000000000000000000000000000000000000000000000000000000000000000003425754000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000054874487158000000000000000000000000000000000000000000000000000000",
    "contractAddress": "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff",
    "cumulativeGasUsed": "10901992",
    "gasUsed": "1067948",
    "confirmations": "6396727",
    "methodId": "0x60a06040",
    "functionName": "",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "13463920",
    "timeStamp": "1634858293",
    "hash": "0x8199bf322c2ba7793a88aa9067c280037ffef93c86b0f3a3a9739028de1231c8",
    "nonce": "3",
    "blockHash": "0x65c176ba916222f13036bd44245e6fdca92463aca95637573f93d17868efe6cf",
    "transactionIndex": "46",
    "from": "0xe9df50db94a4c0b75d0df9a768a37a935c201d05",
    "to": "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff",
    "value": "0",
    "gas": "55539",
    "gasPrice": "72533651550",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0x40c10f19000000000000000000000000d2c7e55f048770999679e266cb99e57c97b0bcf9000000000000000000000000000000000000000006765c78c2ba9428ed7bfffe",
    "contractAddress": "",
    "cumulativeGasUsed": "4194055",
    "gasUsed": "37026",
    "confirmations": "6347948",
    "methodId": "0x40c10f19",
    "functionName": "mint(address _owner, uint256 _amount)",
    "trace_address": [
      -1
    ]
  },
  {
    "blockNumber": "13527871",
    "timeStamp": "1635724941",
    "hash": "0x9124f7df93a1599d3f3049207b28cb552eb2a051190f7a912e6153c547111c56",
    "nonce": "14",
    "blockHash": "0x13c1eb3242dba0b817f3d9d38c608953f8af1a544c0c261bf23300470c451559",
    "transactionIndex": "182",
    "from": "0xd2c7e55f048770999679e266cb99e57c97b0bcf9",
    "to": "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff",
    "value": "0",
    "gas": "77616",
    "gasPrice": "164000560753",
    "isError": "0",
    "txreceipt_status": "1",
    "input": "0xa9059cbb00000000000000000000000070fabf5238f70b0cea742e51201fbdbbba3dc5e50000000000000000000000000000000000000000000000056bc75e2d63100000",
    "contractAddress": "",
    "cumulativeGasUsed": "11298539",
    "gasUsed": "51744",
    "confirmations": "6283997",
    "methodId": "0xa9059cbb",
    "functionName": "transfer(address _to, uint256 _value)",
    "trace_address": [
      -1
    ]
  }
]
const assertions = {
  "0x8199bf322c2ba7793a88aa9067c280037ffef93c86b0f3a3a9739028de1231c8": [
    {
      "method": "emit",
      "args": [
        {
          "interface": {
            "fragments": [
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "minter",
                    "type": "address"
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
                "name": "MINTER_ROLE",
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
                "name": "cap",
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
                    "name": "to",
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
                "inputs": [
                  {
                    "internalType": "bytes4",
                    "name": "interfaceId",
                    "type": "bytes4"
                  }
                ],
                "name": "supportsInterface",
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
        "Transfer"
      ]
    },
    {
      "method": "withArgs",
      "args": [
        "0x0000000000000000000000000000000000000000",
        "0xd2c7E55F048770999679e266cb99e57c97b0BcF9",
        "0x6765c78c2ba9428ed7bfffe"
      ]
    }
  ],
  "0x9124f7df93a1599d3f3049207b28cb552eb2a051190f7a912e6153c547111c56": [
    {
      "method": "emit",
      "args": [
        {
          "interface": {
            "fragments": [
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "minter",
                    "type": "address"
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
                "name": "MINTER_ROLE",
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
                "name": "cap",
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
                    "name": "to",
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
                "inputs": [
                  {
                    "internalType": "bytes4",
                    "name": "interfaceId",
                    "type": "bytes4"
                  }
                ],
                "name": "supportsInterface",
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
        "Transfer"
      ]
    },
    {
      "method": "withArgs",
      "args": [
        "0xd2c7E55F048770999679e266cb99e57c97b0BcF9",
        "0x70FabF5238F70b0CEa742E51201FBDBbba3DC5e5",
        "0x56bc75e2d63100000"
      ]
    },
    {
      "method": "equal",
      "args": "0000000000000000000000000000000000000000000000000000000000000001"
    }
  ],
  "0xafe9777c91eb0ca07c0e2455ff739ba02758e896684346b98f3892717fd91d9c": [
    {
      "method": "not-reverted",
      "args": ""
    }
  ]
}
