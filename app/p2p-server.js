const WebSocket = require('ws')

const P2P_PORT = process.env.P2P_PORT || 5001
const peers = process.env.PEERS ? process.env.PEERS.split(',') : []
const MESSAGE_TYPES = {
    chain: 'CHAIN',
    transaction: 'TRANSACTION',
    clear_transactions: 'CLEAR_TRANSACTIONS'
}

class P2pServer {
    constructor(blockchain, transactionPool) {
        this.blockchain = blockchain
        this.transactionPool = transactionPool
        this.sockets = []
    }

    listen() {
        const server = new WebSocket.Server({ port: P2P_PORT })
        server.on('connection', socket => this.connectSocket(socket))

        this.connectToPeers()

        console.log(`Listening for peer-to-peer connections on: ${P2P_PORT}`)
    }

    connectSocket(socket) {
        this.sockets.push(socket)
        console.log('Socket connected')

        this.messageHandler(socket)

        this.sendChain(socket)
    }

    connectToPeers() {
        peers.forEach(peer => {
            //ws://localhost:5001
            const socket = new WebSocket(peer)

            socket.on('open', () => this.connectSocket(socket))
        })
    }

    messageHandler(socket) {
        socket.on('message', message => {
            const data = JSON.parse(message)
            switch (data.type) {
                case MESSAGE_TYPES.chain:
                    this.blockchain.replaceChain(data.chain)
                    break
                case MESSAGE_TYPES.transaction:
                    this.transactionPool.updateOrAddTransaction(data.transaction)
                    break
                case MESSAGE_TYPES.clear_transactions:
                    this.transactionPool.clear()
                    break
                default:
            }
        })
    }

    sendChain(socket) {
        const message = {
            type: MESSAGE_TYPES.chain,
            chain: this.blockchain.chain
        }
        socket.send(JSON.stringify(message))
    }

    sendTransaction(socket, transaction) {
        const message = {
            type: MESSAGE_TYPES.transaction,
            transaction
        }
        socket.send(JSON.stringify(message))
    }

    syncChains() {
        this.sockets.forEach(socket => this.sendChain(socket))
    }

    broadcastTransaction(transaction) {
        this.sockets.forEach(socket => this.sendTransaction(socket, transaction))
    }

    broadcastClearTransactions() {
        this.sockets.forEach(socket => socket.send(JSON.stringify({
            type: MESSAGE_TYPES.clear_transactions
        })))
    }
}

module.exports = P2pServer
