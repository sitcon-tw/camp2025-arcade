import express from "express";
const router = express.Router();

let toSendList = {};
let pending = false;

const tokenToUser = {};

const toSend = (user, amount, win) => {
    if (!toSendList[user]) {
        toSendList[user] = {
            amount: 0,
            balance: 0,
            win: 0,
            loose: 0,
        };
    }
    toSendList[user].amount += amount;
    toSendList[user].win += win ? 1 : 0;
    toSendList[user].loose += win ? 0 : 1;
    toSendList[user].balance += amount;
    if (!pending) {
        pending = true;
        setTimeout(() => {
            sendAll();
            pending = false;
        }, 5000);
    }
};

const sendAll = () => {
    const users = Object.keys(toSendList);
    for (const user of users) {
        const data = toSendList[user];
        delete toSendList[user];
        delete tokenToUser[data.token];
        fetch(process.env.BACKEND_URL + "/api/bot/arcade/points", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: process.env.CAMP_INTERNAL_API_KEY,
            },
            body: JSON.stringify({
                from_user: user,
                amount: data.amount,
                game_type: "hi-lo",
                note: "點數翻倍機 - 贏了" + data.win + "次，輸了" + data.loose + "次",
            }),
        })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                    console.error("API Error:", response.status, errorData);
                }
            })
            .catch(error => {
                console.error("Error updating balance:", error);
            });
    }
};

router.post("/play", async (req, res) => {
    const { betAmount, winChance, direction } = req.body;
    const parsedBet = parseFloat(betAmount);
    const parsedChance = parseFloat(winChance);

    // get Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const userToken = authHeader.split(" ")[1];
    let balance = 0;
    if (!tokenToUser[userToken]) {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/web/profile", {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            if (!response.ok)
                return res.status(response.status).json({
                    error: `Profile API responded with status: ${response.status}`,
                });
            const userData = await response.json();
            tokenToUser[userToken] = userData.id;
            if (!toSendList[userData.id]) {
                toSendList[userData.id] = {
                    balance: userData.points,
                    amount: 0,
                    win: 0,
                    loose: 0,
                    token: userToken,
                };
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
    const userID = tokenToUser[userToken];
    balance = toSendList[userID].balance;
    if (balance < parsedBet) return res.status(400).json({ error: "輸不起就別玩！" });
    if (isNaN(parsedBet) || parsedBet <= 0) return res.status(400).json({ error: "這什麼數字？" });
    if (parsedBet < 5) return res.status(400).json({ error: "你客家人？" });
    const roll = Math.floor(Math.random() * 10000);
    const isHigh = direction === "high";
    const win = isHigh ? roll > 10000 - parsedChance * 100 : roll < parsedChance * 100;
    const fairOdds = 100 / parsedChance;
    const payout = Math.floor(parsedBet * fairOdds * (1 - 0.03));
    // fetch /api/bot/arcade/add POST
    // Import dotenv at the top of your file
    const reply = { roll, win, payout: payout - parsedBet, balance: balance - parsedBet + (win ? payout : 0) };
    const amount = win ? payout - parsedBet : -parsedBet;
    toSend(userID, amount, win);
    return res.json(reply);
});

export default router;
