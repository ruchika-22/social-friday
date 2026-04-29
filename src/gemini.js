import { GoogleGenerativeAI } from "@google/generative-ai";
import { SECRET_QUESTIONS } from "./games/gameData";

// Initialize the Gemini API using the hidden environment variable
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const getFallbackQuestion = () => {
  return SECRET_QUESTIONS[Math.floor(Math.random() * SECRET_QUESTIONS.length)];
};

// Feature 1: Generate a random, funny icebreaker question
export async function generateDynamicQuestion() {
  try {
    const prompt = `You are a fun, slightly chaotic corporate team-building host. 
    Generate ONE unique, creative, and slightly weird icebreaker question for a teammate to answer. 
    Do not use quotes. Keep it under 15 words. Examples: 'What is your most controversial food opinion?' or 'If you were a kitchen appliance, what would you be?'`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || getFallbackQuestion();
  } catch (error) {
    console.error("Gemini Error:", error);
    return getFallbackQuestion();
  }
}

// Feature 2: Roast the leaderboard
export async function generateLeaderboardCommentary(playersArray) {
  try {
    // Format the player data so the AI understands who is winning
    const scoreboard = playersArray
      .map(p => `${p.name}: ${p.score} points`)
      .join(', ');

    const prompt = `You are an energetic and slightly sarcastic game show host. 
    Here are the current scores for a team building game: ${scoreboard}. 
    Write a 2-sentence funny commentary on these standings. Hype up the winner, or poke gentle fun at the people with 0 points.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "It's anyone's game! Mostly because I short-circuited.";
  }
}