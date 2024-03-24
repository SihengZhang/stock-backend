const express = require('express');
const axios = require('axios');
const app = express();

const finnhub_key = "cn48oe9r01qtsta50gf0cn48oe9r01qtsta50gfg";
const polygon_key = "p1_QwXVF5QFSl8NgLwn_m4k9qzonlKKY";

const database_name = "HW3";
const watchlist_collection_name = "WatchList";
const portfolio_collection_name = "Portfolio";
const watchlist_object_id = "65f9607bcea1aaae8eed81da"
const portfolio_object_id = "65fa9fd2d937ee60fc5e6a3a"

const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const uri = "mongodb+srv://SihengZhang:1q2w%21Q%40W@cluster0.ttpgsno.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        await client.connect();
        await client.db(database_name).command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}


app.get('/Autocomplete/:query_str', function (req, res) {

    const url = `https://finnhub.io/api/v1/search?q=${req.params.query_str}&token=${finnhub_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = [];

            const len = data["count"];
            for(let index = 0; index < len; index++) {
                if(data["result"][index]["type"] === "Common Stock" && !data["result"][index]["symbol"].includes(".")) {
                    output.push({"Symbol" : data["result"][index]["symbol"], "Description" : data["result"][index]["description"]})
                }
            }

            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });
});


app.get('/StockDetails/:ticker', function (req, res) {

    const url1 = `https://finnhub.io/api/v1/stock/profile2?symbol=${req.params.ticker}&token=${finnhub_key}`;
    const url2 = `https://finnhub.io/api/v1/quote?symbol=${req.params.ticker}&token=${finnhub_key}`;

    Promise.all([
        axios.get(url1),
        axios.get(url2)
    ]).then((responses) => {

        const data1 = responses[0].data;
        const data2 = responses[1].data;
        let output = {};

        if(data2["c"] === 0) {
            res.send(output);
            return;
        }

        output["Ticker"] = data1["ticker"];
        output["CompanyName"] = data1["name"];
        output["ExchangeCode"] = data1["exchange"];
        output["Logo"] = data1["logo"];
        output["LastPrice"] = data2["c"].toFixed(2);
        output["Change"] = data2["d"].toFixed(2);
        output["ChangePercentage"] = data2["dp"].toFixed(2) + `%`;

        const date = new Date(data2["t"] * 1000);
        output["CurrentTimestamp"] = `${date.getUTCFullYear()}` + `-` +
            `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}` + `-` +
            `${date.getUTCDate().toString().padStart(2, '0')}` + ` ` +
            `${date.getUTCHours().toString().padStart(2, '0')}` + `:` +
            `${date.getUTCMinutes().toString().padStart(2, '0')}` + `:` +
            `${date.getUTCSeconds().toString().padStart(2, '0')}`;

        const time_now = Math.floor(Date.now() / 1000);
        if(time_now - data2["t"] < 100) {
            output["MarketStatus"] = "Open";
        } else {
            output["MarketStatus"] = "Close"
        }

        res.send(output);

    }).catch((error) => {
        console.error('An error occurred:', error);
    });
});


app.get('/Summary1/:ticker', function (req, res) {

    const url = `https://finnhub.io/api/v1/quote?symbol=${req.params.ticker}&token=${finnhub_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = {};

            if(data["c"] === 0) {
                res.send(output);
                return;
            }

            output["HighPrice"] = data["h"];
            output["LowPrice"] = data["l"];
            output["OpenPrice"] = data["o"];
            output["PrevClose"] = data["pc"];
            output["Timestamp"] = data["t"];

            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });

});


app.get('/Summary2/:ticker', function (req, res) {

    const url1 = `https://finnhub.io/api/v1/stock/profile2?symbol=${req.params.ticker}&token=${finnhub_key}`;
    const url2 = `https://finnhub.io/api/v1/stock/peers?symbol=${req.params.ticker}&token=${finnhub_key}`;

    Promise.all([
        axios.get(url1),
        axios.get(url2)
    ]).then((responses) => {

        const data1 = responses[0].data;
        const data2 = responses[1].data;
        let output = {};

        if(data2.length === 0) {
            res.send(output);
            return;
        }

        output["IPOStartDate"] = data1["ipo"];
        output["Industry"] = data1["finnhubIndustry"];
        output["Webpage"] = data1["weburl"];
        output["CompanyPeers"] = data2;

        res.send(output);

    }).catch((error) => {
        console.error('An error occurred:', error);
    });
});


app.get('/TopNews/:ticker', function (req, res) {

    const date_now = new Date(Date.now());
    let date_last = new Date(Date.now());
    date_last.setUTCFullYear(date_last.getUTCFullYear() - 1);
    const date_now_str = `${date_now.getUTCFullYear()}-${(date_now.getUTCMonth() + 1).toString().padStart(2, '0')}-${date_now.getUTCDate().toString().padStart(2, '0')}`;
    const date_last_str = `${date_last.getUTCFullYear()}-${(date_last.getUTCMonth() + 1).toString().padStart(2, '0')}-${date_last.getUTCDate().toString().padStart(2, '0')}`;

    const url = `https://finnhub.io/api/v1/company-news?symbol=${req.params.ticker}&from=${date_last_str}&to=${date_now_str}&token=${finnhub_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = [];

            let index = 0;
            let count = 0;
            while(index < data.length && count < 20) {
                if(data[index]["source"] !== "" && data[index]["headline"] !== "" && data[index]["summary"] !== "" &&
                   data[index]["url"] !== "" && data[index]["image"] !== "" && data[index]["datetime"] !== 0) {
                    let one_news = {};

                    one_news["Source"] = data[index]["source"];
                    one_news["Title"] = data[index]["headline"];
                    one_news["Description"] = data[index]["summary"];
                    one_news["URL"] = data[index]["url"];
                    one_news["Image"] = data[index]["image"];

                    const date_published = new Date(data[index]["datetime"] * 1000);
                    one_news["PublishedDate"] = date_published.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                    output.push(one_news);
                    count++;
                }

                index++;
            }

            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });
});


app.get('/Charts/:ticker', function (req, res) {

    const date_now = new Date(Date.now());
    let date_2y_ago = new Date(Date.now());
    date_2y_ago.setUTCFullYear(date_2y_ago.getUTCFullYear() - 2);
    const date_now_str = `${date_now.getUTCFullYear()}-${(date_now.getUTCMonth() + 1).toString().padStart(2, '0')}-${date_now.getUTCDate().toString().padStart(2, '0')}`;
    const date_2y_ago_str = `${date_2y_ago.getUTCFullYear()}-${(date_2y_ago.getUTCMonth() + 1).toString().padStart(2, '0')}-${date_2y_ago.getUTCDate().toString().padStart(2, '0')}`;

    const url = `https://api.polygon.io/v2/aggs/ticker/${req.params.ticker}/range/1/day/${date_2y_ago_str}/${date_now_str}?adjusted=true&sort=asc&apiKey=${polygon_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = [];

            const len = data["results"].length;
            for(let index = 0; index < len; index++) {
                output.push([data["results"][index]["t"],
                             data["results"][index]["o"],
                             data["results"][index]["h"],
                             data["results"][index]["l"],
                             data["results"][index]["c"],
                             data["results"][index]["v"]]);
            }
            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });

});


app.get('/Insights/:ticker', function (req, res) {

    const url = `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${req.params.ticker}&token=${finnhub_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = {};

            output["TotalMSPR"] = 0;
            output["PositiveMSPR"] = 0;
            output["NegativeMSPR"] = 0;
            output["TotalChange"] = 0;
            output["PositiveChange"] = 0;
            output["NegativeChange"] = 0;

            const len = data["data"].length;
            for(let index = 0; index < len; index++) {
                output["TotalMSPR"] += data["data"][index]["mspr"];
                if(data["data"][index]["mspr"] > 0) {
                    output["PositiveMSPR"] += data["data"][index]["mspr"];
                } else {
                    output["NegativeMSPR"] += data["data"][index]["mspr"];
                }

                output["TotalChange"] += data["data"][index]["change"];
                if(data["data"][index]["mspr"] > 0) {
                    output["PositiveChange"] += data["data"][index]["change"];
                } else {
                    output["NegativeChange"] += data["data"][index]["change"];
                }
            }

            output["TotalMSPR"] = parseFloat(output["TotalMSPR"].toFixed(2));
            output["PositiveMSPR"] = parseFloat(output["PositiveMSPR"].toFixed(2));
            output["NegativeMSPR"] = parseFloat(output["NegativeMSPR"].toFixed(2));
            output["TotalChange"] = parseFloat(output["TotalChange"].toFixed(2));
            output["PositiveChange"] = parseFloat(output["PositiveChange"].toFixed(2));
            output["NegativeChange"] = parseFloat(output["NegativeChange"].toFixed(2));

            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });

});


app.get('/RecommendationTrends/:ticker', function (req, res) {

    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${req.params.ticker}&token=${finnhub_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = {};

            output["StrongBuy"] = [];
            output["Buy"] = [];
            output["Hold"] = [];
            output["Sell"] = [];
            output["StrongSell"] = [];
            output["Period"] = [];
            output["Name"] = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];

            const len = data.length;
            for(let index = 0; index < len; index++) {
                output["StrongBuy"].push(data[index]["strongBuy"]);
                output["Buy"].push(data[index]["buy"]);
                output["Hold"].push(data[index]["hold"]);
                output["Sell"].push(data[index]["sell"]);
                output["StrongSell"].push(data[index]["strongSell"]);
                output["Period"].push(data[index]["period"].slice(0, 7));
            }

            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });
});


app.get('/CompanyEarnings/:ticker', function (req, res) {

    const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${req.params.ticker}&token=${finnhub_key}`;

    axios.get(url)
        .then((response) => {

            const data = response.data;
            let output = {};

            output["Actual"] = [];
            output["Estimate"] = [];
            output["Surprise"] = [];
            output["Period"] = [];
            output["XAxis"] = [];

            const len = data.length;
            for(let index = 0; index < len; index++) {
                if(data[index]["actual"] === null) {
                    data[index]["actual"] = 0;
                }
                if(data[index]["estimate"] === null) {
                    data[index]["estimate"] = 0;
                }
                if(data[index]["surprise"] === null) {
                    data[index]["surprise"] = 0;
                }

                output["Actual"].push(data[index]["actual"]);
                output["Estimate"].push(data[index]["estimate"]);
                output["Surprise"].push(data[index]["surprise"]);
                output["Period"].push(data[index]["period"]);
                output["XAxis"].push(`${data[index]["period"]}\nSurprise: ${data[index]["surprise"]}`)

            }

            res.send(output);

        })
        .catch((error) => {
            console.error('Error fetching the data:', error);
        });
});


app.get('/WatchList/Add/:ticker', function (req, res) {

    async function Watchlist_add(ticker) {
        try {
            await client.connect();

            const result = await client
                .db(database_name)
                .collection(watchlist_collection_name)
                .updateOne({ _id: new ObjectId(watchlist_object_id) }, {$addToSet:{ tickers: ticker}});

            if (result.modifiedCount === 1 && result.matchedCount === 1) {
                res.send(`Successfully added a stock into the Watchlist: ${ticker}`);
            } else if (result.matchedCount === 1) {
                res.send(`This stock already exists in the watchlist: ${ticker}`);
            } else {
                res.send(`No document matches the provided ID.`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    const ticker = req.params.ticker;

    Watchlist_add(ticker).then();
});


app.get('/WatchList/Delete/:ticker', function (req, res) {

    async function Watchlist_delete(ticker) {
        try {
            await client.connect();

            const result = await client
                .db(database_name)
                .collection(watchlist_collection_name)
                .updateOne({ _id: new ObjectId(watchlist_object_id) }, {$pull:{ tickers: ticker}});

            if (result.modifiedCount > 0 && result.matchedCount === 1) {
                res.send(`Successfully deleted a stock into the Watchlist: ${ticker}`);
            } else if (result.matchedCount === 1) {
                res.send(`This stock is not exists in the watchlist: ${ticker}`);
            } else {
                res.send(`No document matches the provided ID.`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    const ticker = req.params.ticker;

    Watchlist_delete(ticker).then();
});


app.get('/WatchList', function (req, res) {

    async function Watchlist_show() {
        try {
            await client.connect();

            const result = await client
                .db(database_name)
                .collection(watchlist_collection_name)
                .findOne({ _id: new ObjectId(watchlist_object_id) });

            if (result && result["tickers"]) {
                let output = [];

                for(let index = 0; index < result["tickers"].length; index++) {

                    const url = `https://finnhub.io/api/v1/quote?symbol=${result["tickers"][index]}&token=${finnhub_key}`;
                    await axios.get(url)
                        .then((response) => {
                            const data = response.data;
                            if(data["c"] > 0) {
                                output.push({"Ticker" : result["tickers"][index],
                                    "LastPrice" : parseFloat(data["c"].toFixed(2)),
                                    "Change" : parseFloat(data["d"].toFixed(2)),
                                    "ChangePercentage" : data["dp"].toFixed(2) + `%`});
                            }
                        })
                        .catch((error) => {
                            console.error('Error fetching the data:', error);
                        });
                }
                res.send(output);
            } else {
                res.send([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    Watchlist_show().then();
});


app.get('/Portfolio/Buy/:ticker/:quantity/:price', function (req, res) {

    async function Portfolio_buy(ticker, quantity, price) {
        try {
            await client.connect();

            const result = await client
                .db(database_name)
                .collection(portfolio_collection_name)
                .findOne({ _id: new ObjectId(portfolio_object_id)});

            let balance = result["balance"];
            let stocks = result["stocks"];

            balance = balance - quantity * price;
            let stock = stocks.find(obj => obj.ticker === ticker);

            if(stock) {
                stock["quantity"] += quantity;
                stock["cost"] += quantity * price;
            } else {
                stocks.push({"ticker" : ticker,
                             "quantity" : quantity,
                             "cost" : quantity * price});

            }

            await client
                .db(database_name)
                .collection(portfolio_collection_name)
                .updateOne({ _id: new ObjectId(portfolio_object_id) }, {$set : {"balance" : balance, "stocks" : stocks}});

            res.send(stock);

        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    const ticker = req.params.ticker;
    const quantity = parseFloat(req.params.quantity);
    const price = parseFloat(req.params.price);

    Portfolio_buy(ticker, quantity, price).then();
});


app.get('/Portfolio/Sell/:ticker/:quantity/:price', function (req, res) {

    async function Portfolio_sell(ticker, quantity, price) {
        try {
            await client.connect();

            const result = await client
                .db(database_name)
                .collection(portfolio_collection_name)
                .findOne({ _id: new ObjectId(portfolio_object_id)});

            let balance = result["balance"];
            let stocks = result["stocks"];


            let stock = stocks.find(obj => obj.ticker === ticker);

            if(stock) {
                const cost_per_share = stock["cost"] / stock["quantity"];
                if(quantity > stock["quantity"]) {
                    quantity = stock["quantity"];
                }
                balance = balance + quantity * price;
                stock["quantity"] -= quantity;
                stock["cost"] = stock["quantity"] * cost_per_share;
            }

            stocks = stocks.filter(obj => obj.quantity > 0);

            await client
                .db(database_name)
                .collection(portfolio_collection_name)
                .updateOne({ _id: new ObjectId(portfolio_object_id) }, {$set : {"balance" : balance, "stocks" : stocks}});

            res.send(stock);

        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    const ticker = req.params.ticker;
    const quantity = parseFloat(req.params.quantity);
    const price = parseFloat(req.params.price);

    Portfolio_sell(ticker, quantity, price).then();
});


app.get('/Portfolio/Reset', function (req, res) {

    async function Portfolio_reset() {
        try {
            await client.connect();

            await client
                .db(database_name)
                .collection(portfolio_collection_name)
                .updateOne({ _id: new ObjectId(portfolio_object_id) }, {$set : {"balance" : 25000, "stocks" : []}});

            res.send("Successfully reset balance to 25000$ and deleted all stocks");

        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    Portfolio_reset().then();

});


app.get('/Portfolio', function (req, res) {

    async function Portfolio_show() {
        try {
            await client.connect();

            const result = await client
                .db(database_name)
                .collection(portfolio_collection_name)
                .findOne({ _id: new ObjectId(portfolio_object_id)});

            let output = {};

            output["balance"] = result["balance"];
            output["stocks_info"] = [];

            for(let index = 0; index < result["stocks"].length; index++) {

                let info = {};
                const stock = result["stocks"][index];

                const url1 = `https://finnhub.io/api/v1/stock/profile2?symbol=${stock["ticker"]}&token=${finnhub_key}`;
                const url2 = `https://finnhub.io/api/v1/quote?symbol=${stock["ticker"]}&token=${finnhub_key}`;

                await Promise.all([
                    axios.get(url1),
                    axios.get(url2)
                ]).then((response) => {
                        info["ticker"] = stock["ticker"];
                        info["quantity"] = stock["quantity"];
                        info["cost_per_share"] = stock["cost"] / stock["quantity"];
                        info["cost"] = stock["cost"];

                        info["company_name"] = response[0].data["name"];
                        info["current_price"] = parseFloat(response[1].data["c"].toFixed(2));

                        info["change"] = parseFloat((info["current_price"] - info["cost_per_share"]).toFixed(2));
                        info["market_value"] = parseFloat((info["quantity"] * info["current_price"]).toFixed(2));
                    })
                    .catch((error) => {
                        console.error('Error fetching the data:', error);
                    });

                output["stocks_info"].push(info);
            }

            res.send(output);

        } catch (err) {
            console.error(err);
        } finally {
            await client.close();
        }
    }

    Portfolio_show().then();

});


run().catch(console.dir);


app.listen(9090, function () {
    console.log(`Server running at\n
     http://localhost:9090/Autocomplete/AA\n
     http://localhost:9090/StockDetails/AAPL\n
     http://localhost:9090/Summary1/AAPL\n
     http://localhost:9090/Summary2/AAPL\n
     http://localhost:9090/TopNews/AAPL\n
     http://localhost:9090/Charts/AAPL\n
     http://localhost:9090/Insights/AAPL\n
     http://localhost:9090/RecommendationTrends/AAPL\n
     http://localhost:9090/CompanyEarnings/AAPL\n
     http://localhost:9090/WatchList/Add/AAPL\n
     http://localhost:9090/WatchList/Delete/AAPL\n
     http://localhost:9090/WatchList\n
     http://localhost:9090/Portfolio/Buy/AAPL/20/100\n
     http://localhost:9090/Portfolio/Sell/AAPL/20/100\n
     http://localhost:9090/Portfolio/Reset\n
     http://localhost:9090/Portfolio`);
});
