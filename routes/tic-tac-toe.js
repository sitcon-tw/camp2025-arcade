import express from "express";
const router = express.Router();

router.post("/play", (req, res) => {
    const { betAmount, winChance, direction } = req.body;
    const parsedBet = parseFloat(betAmount);
    const parsedChance = parseFloat(winChance);

    // get Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const userToken = authHeader.split(" ")[1];
    let balance = 0;
    fetch("https://camp.sitcon.party/api/web/profile", {
        headers: {
            Authorization: `Bearer ${userToken}`,
        },
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Profile API responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            balance = data.points;
            if (balance < parsedBet) return res.status(400).json({ error: "輸不起就別玩！" });
            if (isNaN(parsedBet) || parsedBet <= 0) return res.status(400).json({ error: "這什麼數字？" });

            const roll = Math.floor(Math.random() * 10000);
            const isHigh = direction === "high";
            console.log(isHigh);
            const win = isHigh ? roll > 10000 - parsedChance * 100 : roll < parsedChance * 100;
            const houseEdge = 0.4;
            const fairOdds = 100 / parsedChance;
            const payout = Math.round(parsedBet * fairOdds * (1 - houseEdge));
            // fetch /api/bot/arcade/add POST
            // Import dotenv at the top of your file
            const apiKey = process.env.CAMP_INTERNAL_API_KEY;
            fetch("https://camp.sitcon.party/api/bot/arcade/points", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    token: apiKey,
                },
                body: JSON.stringify({
                    from_user: data.id,
                    amount: win ? payout : -parsedBet,
                    game_type: "hi-lo",
                    note: "點數翻倍機 - " + (win ? "贏" : "輸"),
                }),
            })
                .then(async response => {
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                        console.error("API Error:", response.status, errorData);
                        return res.status(response.status).json({ error: errorData.message || "Failed to update balance" });
                    }
                    res.json({ roll, win, payout: payout, balance: balance - parsedBet + (win ? payout : 0) });
                })
                .catch(error => {
                    console.error("Error updating balance:", error);
                    return res.status(500).json({ error: "Internal server error" });
                });
        });
});

export default router;
