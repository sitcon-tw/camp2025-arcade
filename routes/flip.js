import express from "express";
const router = express.Router();

let game = {};
router.post("/play", async (req, res) => {
    const { bet, side, round } = req.body;
    // get Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const userToken = authHeader.split(" ")[1];
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
        const balance = userData.points || 0;
        if (balance < bet) return res.status(400).json({ error: "輸不起就別玩！" });
        if (isNaN(bet) || bet <= 0) return res.status(400).json({ error: "這什麼數字？" });
        if (round > 0) {
            if (!game[userData.id]) {
                return res.status(400).json({ error: "你還沒開始遊戲！" });
            }
            if (game[userData.id].round != round) {
                return res.status(400).json({ error: "你不該玩這一輪" });
            }
        } else game[userData.id] = { round: 0, bet: bet }; ///////////////////////////////////////////////////////
        const roll = Math.random() > 0.5 ? "heads" : "tails";
        const win = roll === side;
        if (win) {
            game[userData.id].bet *= 2;
            game[userData.id].round++;
        } else {
            delete game[userData.id];
        }
        const reply = { win, roll };
        return res.json(reply);
    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});

router.get("/cashout", async (req, res) => {
    // get Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const userToken = authHeader.split(" ")[1];
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
        const balance = userData.points || 0;
        if (!game[userData.id]) {
            return res.status(400).json({ error: "你還沒開始遊戲！" });
        }
        const bet = game[userData.id];
        delete game[userData.id];
        if (bet.round <= 0) {
            return res.status(400).json({ error: "出金金額必須大於 0" });
        }
        fetch(process.env.BACKEND_URL + "/api/bot/arcade/points", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: process.env.CAMP_INTERNAL_API_KEY,
            },
            body: JSON.stringify({
                from_user: user,
                amount: bet.bet,
                game_type: "投硬幣",
                note: "連續贏了 " + bet.round + " 次"
            }),
        })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                    console.error("API Error:", response.status, errorData);
                    game[userData.id] = bet; // Restore game state on error
                }
            })
            .catch(error => {
                console.error("Error updating balance:", error);
                game[userData.id] = bet; // Restore game state on error
            });
        return res.json({ success: true, points: bet });
    } catch (error) {
        console.error("Error fetching profile:", error);
        game[userData.id] = bet; // Restore game state on error
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});

export default router;
