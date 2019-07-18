import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import './App.css';

const LatestTransactions = () => {
  return (
    <div>Will show latest transactions</div>
  )
}

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

class SearchTransactions extends Component {
  state = {
    searchValue: null,
    closestValues: []
  }

  searchTextChanged = (e) => {
    const searchText = e.target.value;
    this.setState({ searchValue: parseFloat(searchText) }, () => this.findClosestThree())
  }

  findClosestThree() {
    const { transactions } = this.props;
    const { searchValue } = this.state;
    const computeDifference = transactions.map((tx) => {
      const { value } = tx;
      return  {
        diff: Math.abs(value - searchValue),
        tx
      }
    })

    const sortedDifference = computeDifference.sort((A, B) => B.diff - A.diff);
    const closestThree = sortedDifference.slice(0 , 3)
    console.log('closest 3 --> ', { closestThree, sortedDifference })
    const values = closestThree.map(c => c.tx)
    this.setState({ closestValues: values })
  }

  render() {
    const { searchText, closestValues } = this.state;
    return (
      <div className="tab second-tab">
        <input type="number" value={searchText} onChange={(e) => this.searchTextChanged(e)} />
        <div>
          <div>Closest Results:</div>
          {
            closestValues.map(c => <div key={c.txIndex}>
              <b>BTC Value:</b><span>{ c.BTCValue }</span>
            </div>)
          }
        </div>
        
      </div>
    )
  }
}

class App extends Component {
  state = {
    connectionStatus: 'Disconnected',
    transactions: [],
    latestTransactions: [],
    transactionLimit: 10,
    selectedTab: 0
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
    const { time, value, tx_index } = transaction;
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
      BTCValue,
      txIndex: tx_index
    };
    return tx;
  }

  addNewTransaction(tx) {
    const { BTCValue } = tx;
    // Ignore tx with BTC less than 1
    if (BTCValue < 1) return;

    const { latestTransactions, transactions, transactionLimit } = this.state;
    let newTransactions = [];
    if (latestTransactions.length < transactionLimit) {
      // have some space
      newTransactions = [tx, ...latestTransactions]
    } else {
      // overflow, remove the oldest transaction
      const removingOldestTransaction = [...latestTransactions.slice(0, transactionLimit - 1)];
      newTransactions = [tx, ...removingOldestTransaction];
    }

    this.setState({
      latestTransactions: newTransactions,
      transactions: [tx, ...transactions]
    })
  }

  parseDataForChart(data) {
    return data.map((d) => {
      return {
        label: 'BTC Value',
        data: d.BTCValue
      }
    })
  }

  setActiveTab = (activeTab) => {
    this.setState({ selectedTab: activeTab })
  }

  render() {
    const { connectionStatus, transactions, latestTransactions, selectedTab } = this.state;
    // const dataForChart = this.parseDataForChart(transactions);

    return (
      <div className="App">
        <div>Socket connection: { connectionStatus }</div>
        <div className="transactions">
          <span>Number of transactions: { latestTransactions.length }</span>
          {/* <LineChart values={dataForChart} /> */}
          <div className="tabs">
            <div className="tab-options">
              <div className={`tab ${ selectedTab === 0 ? 'active' : '' }`} onClick={() => this.setActiveTab(0)}>
                Latest Transactions
              </div>
              <div className={`tab ${ selectedTab === 1 ? 'active' : '' }`}  onClick={() => this.setActiveTab(1)}>
                Search Transactions
              </div>
            </div>
            <div className="tab-content">
              {
                selectedTab === 0 && <LatestTransactions />
              }
              {
                selectedTab === 1 && <SearchTransactions transactions={transactions} />
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
