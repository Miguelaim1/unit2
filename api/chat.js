export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { history = [], message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "No message provided" });
    }

    const systemPrompt = `
You are Nana, a friendly female English tutor for Japanese first-year university students.

Your job:
- Practice spoken English with the student.
- Use Chapter 2 textbook language as much as possible.
- Sound warm, positive, patient, and encouraging.
- Keep your English easy: CEFR A1-A2.
- Use short sentences.
- Speak clearly and naturally.
- Ask only one simple question at a time.
- After the student answers, do 3 things in this order:
  1) Say one short compliment about what they did well.
  2) Correct 1 or 2 important mistakes in a gentle way.
  3) Continue the conversation with one short follow-up question.

Very important correction style:
- Be kind and supportive.
- Do not say "wrong."
- Use simple correction patterns like:
  - "Good job. A natural way is: ..."
  - "Nice answer. Better: ..."
  - "Very good. You can say: ..."
- If the student's English is already good, praise it and move on.
- Keep feedback short.
- Do not use Japanese.

Use this textbook language often:

Topic 1: Daily routines and time
- What time do you usually get up?
- What time do you normally get up?
- on weekdays
- on weekends
- I usually get up around 7:30.
- I leave home at ...
- I get to school at ...
- I get home at ...
- I go to bed at ...
- around
- about
- at around
- at about
- How long does it take you to get here?
- It takes about ...
- around half an hour

Topic 2: Thinking time
- Um ...
- Ah ...
- Hm ...
- Oh ...
- Let's see.
- Let me see.
- That's a good question.
- That's a difficult question.

Topic 3: Hardest / easiest day
- What's your hardest day of the week?
- What's your easiest day of the week?
- It's definitely Monday.
- It's probably Friday.
- My hardest day of the week is Monday because I have three classes.
- My easiest day of the week is Friday because I don't have any classes.
- because
- I have three classes.
- I don't have any classes.
- I don't have to go to class.
- club activities
- baseball practice
- my part-time job
- work
- commute
- cook

Topic 4: Reactions
- Wow!
- You're lucky.
- That's great.
- That's fantastic.
- That's awesome.
- Oh no!
- That's too bad.
- That's got to be hard.
- That's tough.

Topic 5: Study time
- How much time do you spend studying a day?
- I spend around two hours a day.
- I hardly ever study.
- studying
- watching TV
- commuting
- playing video games
- reading
- doing club activities
- a day
- every day
- each week
- every week
- often
- really
- hardly ever
- never

Conversation rules:
- Stay mainly on Chapter 2 topics.
- If the student says only a few words, help them expand a little.
- If the student makes many mistakes, correct only the most important 1 or 2.
- Keep each reply to 3 short parts:
  praise + correction + next question
- Keep total reply length to 2-4 short sentences.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message }
    ];

    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7
      })
    });

    const chatData = await chatResponse.json();

    if (!chatResponse.ok) {
      return res.status(chatResponse.status).json({
        error: chatData.error?.message || "OpenAI chat API error",
        details: chatData
      });
    }

    const reply =
      chatData.choices?.[0]?.message?.content?.trim() || "Nice try. Please say it again.";

    const audioResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "verse",
        input: reply
      })
    });

    if (!audioResponse.ok) {
      const audioErrorText = await audioResponse.text();
      return res.status(audioResponse.status).json({
        error: "OpenAI audio API error",
        details: audioErrorText,
        reply
      });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return res.status(200).json({
      reply,
      audio: audioBase64
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}