const { utils } = require('ethers')
const fs = require('fs')
const glob = require('glob')
const chalk = require('chalk')
const { task } = require('hardhat/config')
require('@nomiclabs/hardhat-waffle')
require('@tenderly/hardhat-tenderly')
require('@nomiclabs/hardhat-etherscan')
require('@openzeppelin/hardhat-upgrades')
require('dotenv').config()

const { isAddress, getAddress, formatUnits, parseUnits } = utils

//
// Select the network you want to deploy to here:
//
// const defaultNetwork = 'localhost'
const defaultNetwork = 'matic'

const mnemonic = (() => {
  try {
    return fs.readFileSync('./mnemonic.txt').toString().trim()
  } catch (e) {
    if (defaultNetwork !== 'localhost') {
      console.log(' ☢️ WARNING: No mnemonic.txt created for a deploy account. Try `yarn run generate` and then `yarn run account`.')
    }
  }
})()

const infuraId = process.env.INFURA_ID

module.exports = {
  defaultNetwork,

  // don't forget to set your provider like:
  // REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
  // (then your frontend will talk to your contracts on the live network!)

  paths: {
    sources: 'src',
  },

  networks: {
    localhost: {
      url: 'http://localhost:8545',
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraId}`,
      accounts: { mnemonic },
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${infuraId}`,
      accounts: { mnemonic },
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infuraId}`,
      accounts: { mnemonic },
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${infuraId}`,
      accounts: { mnemonic },
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraId}`,
      accounts: { mnemonic },
    },
    xdai: {
      url: 'https://rpc.xdaichain.com/',
      gasPrice: 1000000000,
      accounts: { mnemonic },
    },
    matic: {
      url: 'https://polygon-rpc.com',
      accounts: { mnemonic },
    },
  },
  solidity: {
    compilers: [{
      version: '0.8.4',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    }],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      xdai: "any value will work here",
    },
  },
  tenderly: {
		username: 'dysbulic',
		project: 'achievements',
	},
}

const DEBUG = false
const debug = (...info) => {
  if (DEBUG) console.debug(...info)
}

task('env', 'Display the execution environment', async () => {
  console.info({ __dirname, env: process.env, config })
})

task('su', 'Add a superuser')
.addParam('address', 'Address of the user to promote')
.setAction(async (args, { ethers }) => {
  const [, srcDir] = config.paths.sources.match(/^.*\/([^\/]+)\/?$/)
  const contractsHome = `${config.paths.artifacts}/${srcDir}/`
  const [contractFile] = (
    glob
    .sync(`${contractsHome}/*/*`)
    .filter((name) => !/\.dbg\.json$/.test(name))
  )
  const { abi, contractName } = JSON.parse(
    fs.readFileSync(contractFile).toString()
  )
  console.debug(
    ` 🦐 Loaded ${chalk.hex('#88C677')(contractName)} From:`
    + ` ${chalk.hex('#E59AF9')(contractFile)}`
  )
  const local = false
  const address = (
    fs
    .readFileSync(
      `${config.paths.artifacts}/${local ? 'local/' : ''}${contractName}.address`
    )
    .toString()
    .trim()
  )
  const contract = (
    new ethers.Contract(address , abi, ethers.provider.getSigner())
  )
  const { address: user } = args
  console.log(` 🍏 Setting ${user} as superuser on ${contractName} (${address})`)
  const tx = await contract['grantRole(uint8,address)'](0, user)
  console.info(` 🕋 Tx: ${tx.hash}`)
})

task('grant', 'Grant a role')
.addParam('address', 'Address of the user to promote')
.addParam('role', 'Role to grant')
.setAction(async (args, { ethers }) => {
  const [, srcDir] = config.paths.sources.match(/^.*\/([^\/]+)\/?$/)
  const contractsHome = `${config.paths.artifacts}/${srcDir}/`
  const [contractFile] = (
    glob
    .sync(`${contractsHome}/*/*`)
    .filter((name) => !/\.dbg\.json$/.test(name))
  )
  const { abi, contractName } = JSON.parse(
    fs.readFileSync(contractFile).toString()
  )
  console.debug(
    ` 🦐 Loaded ${chalk.hex('#88C677')(contractName)} From:`
    + ` ${chalk.hex('#E59AF9')(contractFile)}`
  )
  const local = false
  const address = (
    fs
    .readFileSync(
      `${config.paths.artifacts}/${local ? 'local/' : ''}${contractName}.address`
    )
    .toString()
    .trim()
  )
  const contract = (
    new ethers.Contract(address , abi, ethers.provider.getSigner())
  )
  const { address: user } = args
  console.log(` 🍏 Setting ${user} as superuser on ${contractName} (${address})`)
  const tx = await contract['grantRole(uint8,address)'](Number(args.role), user)
  console.info(` 🕋 Tx: ${tx.hash}`)
})

task('wallet', 'Create a wallet (pk) link', async (_, { ethers }) => {
  const randomWallet = ethers.Wallet.createRandom()
  const privateKey = randomWallet._signingKey().privateKey
  console.log(` 🔐 WALLET Generated As ${randomWallet.address}`)
  console.log(` 🔗 http://localhost:3000/pk#${privateKey}`)
})


task('fundedwallet', 'Create a wallet (pk) link and fund it with deployer?')
.addOptionalParam('amount', 'Amount of ETH to send to wallet after generating')
.addOptionalParam('url', 'URL to add pk to')
.setAction(async (taskArgs, { network, ethers }) => {
  const randomWallet = ethers.Wallet.createRandom()
  const privateKey = randomWallet._signingKey().privateKey
  console.log(` 🔐 WALLET Generated As ${randomWallet.address}`)
  let { url = 'http://localhost:3000' } = taskArgs

  let localDeployerMnemonic
  try{
    localDeployerMnemonic = (
      fs.readFileSync('./mnemonic.txt')
      .toString()
      .trim()
    )
  } catch (e) {
    /* do nothing - this file isn't always there */
  }

  let amount = taskArgs.amount ?? '0.01'
  const tx = {
    to: randomWallet.address,
    value: ethers.utils.parseEther(amount)
  }

  // SEND USING LOCAL DEPLOYER MNEMONIC IF THERE IS ONE
  // IF NOT SEND USING LOCAL HARDHAT NODE:
  if(localDeployerMnemonic){
    let deployerWallet = ethers.Wallet.fromMnemonic(localDeployerMnemonic)
    deployerWallet = deployerWallet.connect(ethers.provider)
    console.log(` 💵 Sending ${amount} ETH to ${randomWallet.address} using deployer account`)
    let sendresult = await deployerWallet.sendTransaction(tx)
    console.log(`   ${url}/pk#${privateKey}`)
    return
  } else {
    console.log(` 💵 Sending ${amount} ETH to ${randomWallet.address} using local node`)
    console.log(`   ${url}/pk#${privateKey}`)
    return send(ethers.provider.getSigner(), tx)
  }
})

task('generate', 'Create a mnemonic for builder deploys', async (_, { ethers }) => {
  const bip39 = require('bip39')
  const hdkey = require('ethereumjs-wallet/hdkey')
  const monic = mnemonic ?? bip39.generateMnemonic()
  debug('mnemonic', monic)
  const seed = await bip39.mnemonicToSeed(monic)
  debug('seed', seed)
  const hdwallet = hdkey.fromMasterSeed(seed)
  const walletHDPath = "m/44'/60'/0'/0/"
  const accountIndex = 0
  let fullPath = walletHDPath + accountIndex
  debug('fullPath', fullPath)
  const wallet = hdwallet.derivePath(fullPath).getWallet()
  const privateKey = `0x${wallet._privKey.toString('hex')}`
  debug('privateKey', privateKey)
  var EthUtil = require('ethereumjs-util')
  const address = `0x${EthUtil.privateToAddress(wallet._privKey).toString('hex')}`
  console.log(` 🔐 Account Generated as ${address} and set as mnemonic in packages/hardhat`)
  console.log(' 💬 Use `yarn run account` to get more information about the deployment account.')

  fs.writeFileSync(`${address}.txt`, monic.toString())
  if(fs.existsSync('mnemonic.txt')) {
    console.warn('mnemonic.txt exists; skipping.')
  } else {
    fs.writeFileSync('./mnemonic.txt', monic.toString())
  }
})

task('mineContractAddress', 'Looks for a deployer account that will give leading zeros')
.addParam('searchFor', 'String to search for')
.setAction(async (taskArgs, { network, ethers }) => {
  let contract_address = ''
  let address

  const bip39 = require('bip39')
  const hdkey = require('ethereumjs-wallet/hdkey')

  let mnemonic = ''
  while(contract_address.indexOf(taskArgs.searchFor) != 0) {
    mnemonic = bip39.generateMnemonic()
    debug('mnemonic', mnemonic)
    const seed = await bip39.mnemonicToSeed(mnemonic)
    debug('seed', seed)
    const hdwallet = hdkey.fromMasterSeed(seed)
    const wallet_hdpath = "m/44'/60'/0'/0/"
    const account_index = 0
    let fullPath = wallet_hdpath + account_index
    debug('fullPath', fullPath)
    const wallet = hdwallet.derivePath(fullPath).getWallet()
    const privateKey = '0x' + wallet._privKey.toString('hex')
    debug('privateKey', privateKey)
    var EthUtil = require('ethereumjs-util')
    address = `0x${EthUtil.privateToAddress(wallet._privKey).toString('hex')}`


    const rlp = require('rlp')
    const keccak = require('keccak')

    let nonce = 0x00 //The nonce must be a hex literal!
    let sender = address

    let input_arr = [sender, nonce]
    let rlp_encoded = rlp.encode(input_arr)

    let contract_address_long = keccak('keccak256').update(rlp_encoded).digest('hex')

    contract_address = contract_address_long.substring(24)
  }

  console.log(` ⛏  Account Mined as ${address} and set as mnemonic in packages/hardhat`)
  console.log(` 📜 This will create the first contract: ${chalk.magenta(`0x${contract_address}`)}`)
  console.log(' 💬 Use `yarn run account` to get more information about the deployment account.')

  fs.writeFileSync(`${address}_produces-${contract_address}.txt`, mnemonic.toString())
  if(fs.existsSync('mnemonic.txt')) {
    console.warn('mnemonic.txt exists; skipping.')
  } else {
    fs.writeFileSync('mnemonic.txt', mnemonic.toString())
  }
})

task('account', 'Get balance information for the deployment account.', async (_, { ethers }) => {
  const hdkey = require('ethereumjs-wallet/hdkey')
  const bip39 = require('bip39')
  let mnemonic = fs.readFileSync('./mnemonic.txt').toString().trim()
  debug('mnemonic', mnemonic)
  const seed = await bip39.mnemonicToSeed(mnemonic)
  debug('seed', seed)
  const hdwallet = hdkey.fromMasterSeed(seed)
  const wallet_hdpath = "m/44'/60'/0'/0/"
  const account_index = 0
  let fullPath = wallet_hdpath + account_index
  debug('fullPath', fullPath)
  const wallet = hdwallet.derivePath(fullPath).getWallet()
  const privateKey = '0x' + wallet._privKey.toString('hex')
  debug('privateKey', privateKey)
  var EthUtil = require('ethereumjs-util')
  const address = '0x' + EthUtil.privateToAddress(wallet._privKey).toString('hex')

  var qrcode = require('qrcode-terminal')
  qrcode.generate(address)
  console.log(` ‍📬 Deployer Account is ${address}`)
  for (let n in config.networks) {
    try {
      let provider = new ethers.providers.JsonRpcProvider(config.networks[n].url)
      let balance = (await provider.getBalance(address))
      console.log(` -- ${n} --  -- -- 📡`)
      console.log(`   balance: ${ethers.utils.formatEther(balance)}`)
      console.log(`   nonce: ${(await provider.getTransactionCount(address))}`)
    } catch(error) {
      if (DEBUG) console.error({ error })
    }
  }
})

const addr = async (ethers, addr) => {
  if (isAddress(addr)) {
    return getAddress(addr)
  }
  const accounts = await ethers.provider.listAccounts()
  if (accounts[addr] !== undefined) {
    return accounts[addr]
  }
  throw `Could not normalize address: ${addr}`
}

task('accounts', 'Prints the list of accounts', async (_, { ethers }) => {
  const accounts = await ethers.provider.listAccounts()
  accounts.forEach((account) => console.log(account))
})

task('blockNumber', 'Prints the block number', async (_, { ethers }) => {
  const blockNumber = await ethers.provider.getBlockNumber()
  console.log({ blockNumber })
})

task('balance', "Prints an account's balance")
.addPositionalParam('account', "The account's address")
.setAction(async (taskArgs, { ethers }) => {
  const balance = await ethers.provider.getBalance(
    await addr(ethers, taskArgs.account)
  )
  console.log(formatUnits(balance, 'ether'), 'ETH')
})

const send = (signer, txparams) => {
  return signer.sendTransaction(txparams, (error, transactionHash) => {
    if (error) {
      debug(`Error: ${error}`)
    }
    debug(`transactionHash: ${transactionHash}`)
    // checkForReceipt(2, params, transactionHash, resolve)
  })
}

task('send', 'Send ETH')
.addParam('from', 'From address or account index')
.addOptionalParam('to', 'To address or account index')
.addOptionalParam('amount', 'Amount to send in ether')
.addOptionalParam('data', 'Data included in transaction')
.addOptionalParam('gasPrice', 'Price you are willing to pay in gwei')
.addOptionalParam('gasLimit', 'Limit of how much gas to spend')
.setAction(async (taskArgs, { network, ethers }) => {
  const from = await addr(ethers, taskArgs.from)
  debug(`Normalized from address: ${from}`)
  const fromSigner = await ethers.provider.getSigner(from)

  let to
  if (taskArgs.to) {
    to = await addr(ethers, taskArgs.to)
    debug(`Normalized to address: ${to}`)
  }

  const txRequest = {
    from: await fromSigner.getAddress(),
    to,
    value: (
      parseUnits(
        taskArgs.amount ?? '0',
        'ether'
      )
      .toHexString()
    ),
    nonce: await fromSigner.getTransactionCount(),
    gasPrice: (
      parseUnits(
        taskArgs.gasPrice ?? '1.001',
        'gwei'
      )
      .toHexString()
    ),
    gasLimit: taskArgs.gasLimit ?? 24000,
    chainId: network.config.chainId,
  }

  if(taskArgs.data !== undefined) {
    txRequest.data = taskArgs.data
    debug(`Adding data to payload: ${txRequest.data}`)
  }
  debug(`${Number(txRequest.gasPrice) / 1000000000} gwei`)
  debug(JSON.stringify(txRequest, null, 2))

  return send(fromSigner, txRequest)
})

task('sign', 'Sign the contents of a file')
.addParam('toSign', 'File whose contents to sign')
.setAction(async (taskArgs, { ethers }) => {
  const { toSign: file } = taskArgs
  if(!file || file === '') {
    console.info('Usage: $0 sign file.txt')
  } else if(!fs.existsSync(file)) {
    throw new Error(`File “${file}” doesn't exist.`)
  } else {
    const content = fs.readFileSync(file).toString()
    const indented = `>   ${content.replace("\n", "\n>   ")}`
    console.info(`Signing: \n${indented}`)
    const sig = await ethers.provider.getSigner().signMessage(content)
    console.info(`Signature: “${sig}”`)
  }
})