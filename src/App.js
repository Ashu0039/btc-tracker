import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import './App.css';

const LineChart = ({ values }) => {
  console.log('data values --> ', values)
  const dataProp = {
    labels: values.map(d => d.label),
    datasets: values.map(d => ({ backgroundColor: 'crimson', data: d.data }))
  }
  console.log('datasets ==> ', { dataProp })
  return (
    <Line data={dataProp} width={100} height={100} />
  )
}

class App extends Component {
  state = {
    connectionStatus: 'Disconnected',
    transactions: [],
    transactionLimit: 10
  }
  componentDidMount() {
    this.setState({ connectionStatus: 'Connecting..' })

    const webSocket = new WebSocket('wss://ws.blockchain.info/inv')
    webSocket.onopen = (event) => {
      this.setState({ connectionStatus: 'Connected!' })
      console.log('websocket is open')
      webSocket.send(JSON.stringify({ op: 'ping' }))
    }

    webSocket.onmessage = (event) => {
      // console.log('got message from socket --> ', event.data)
      const message = JSON.parse(event.data);
      const { op } = message;

      if (op === 'pong') {
        // connected and got ack
        webSocket.send(JSON.stringify({"op":"unconfirmed_sub"}))
      } else if (op === 'utx') {
        // console.log('Got new transaction', { transaction: message })
        const { x } = message;
        const { time, out } = x;
        if (out.length !== 0) {
          const firstValue = out[0];
          const { value } = firstValue;
          const parsedValue = this.parseTransaction({ time, value });
          this.addNewTransaction(parsedValue);
        } else {
          // handle the error case, need out to have some length, or ignore it
        }
      }
    }

    webSocket.onclose = () => {
      this.socketDisconnected()
    }

    webSocket.onerror = () => {
      this.socketDisconnected()
    }
  }

  socketDisconnected() {
    this.setState({ connectionStatus: 'Disconnected!' })
  }

  parseTransaction(transaction) {
    const { time, value } = transaction;
    const BTCValue = value / 100000000;
    const date = new Date(time * 1000);
    let hours, minutes, seconds;
    hours = date.getHours();
    // Minutes part from the timestamp
    if (date.getMinutes() < 10) {
      minutes = "0" + date.getMinutes();
    } else {
      minutes = date.getMinutes();
    }

    if (date.getSeconds() < 10) {
      seconds = "0" + date.getSeconds();
    } else {
      seconds = date.getSeconds();
    }

    const timeValue = `${hours}:${minutes}:${seconds} +05:30`;
    const tx = {
      ...transaction,
      readableTime: timeValue,
      BTCValue
    };
    return tx;
  }

  addNewTransaction(tx) {
    const { BTCValue } = tx;
    // Ignore tx with BTC less than 1
    if (BTCValue < 1) return;

    const { transactions, transactionLimit } = this.state;
    let newTransactions = [];
    if (transactions.length < transactionLimit) {
      // have some space
      newTransactions = [tx, ...transactions]
    } else {
      // overflow, remove the oldest transaction
      const removingOldestTransaction = [...transactions.slice(0, transactionLimit - 1)];
      newTransactions = [tx, ...removingOldestTransaction];
    }

    this.setState({ transactions: newTransactions })
  }

  parseDataForChart(data) {
    return data.map((d) => {
      return {
        label: 'BTC Value',
        data: d.BTCValue
      }
    })
  }

  render() {
    const { connectionStatus, transactions } = this.state;
    const dataForChart = this.parseDataForChart(transactions);

    return (
      <div className="App">
        <div>Socket connection: { connectionStatus }</div>
        <div className="transactions">
          <span>Number of transactions: { transactions.length }</span>
          <LineChart values={dataForChart} />
        </div>
      </div>
    );
  }
}

export default App;
