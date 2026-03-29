const handleSend = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || loading) return;

  const userMessage = input;
  setInput("");
  setLoading(true);
  setError(null);

  try {
    // ✅ Correct API Key from Vercel Environment Variable
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    // 1. Save user message to Firestore
    const timestamp = new Date().toISOString();
    await addDoc(collection(db, "chat_history"), {
      userId: user.uid,
      subject: selectedSubject,
      role: "user",
      content: userMessage,
      timestamp
    });

    // 2. Fetch context from knowledge_base
    const kbQuery = query(
      collection(db, "knowledge_base"),
      where("subject", "==", selectedSubject)
    );

    const kbSnapshot = await getDocs(kbQuery);

    const relevantDocs = kbSnapshot.docs
      .map(doc => doc.data())
      .filter(doc =>
        doc.content.toLowerCase().includes(userMessage.toLowerCase()) ||
        doc.topic?.toLowerCase().includes(userMessage.toLowerCase())
      )
      .slice(0, 2);

    const context = relevantDocs.map(doc => doc.content).join("\n");

    // 3. Call Gemini API
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{
            text: `You are an expert AI Tutor.
Subject: ${selectedSubject}
Context from Textbook: ${context || "No specific context found."}

Student Question: ${userMessage}

Please provide a clear, step-by-step explanation.`
          }]
        }
      ],
      config: {
        temperature: 0.7,
      }
    });

    const aiResponse =
      response.text || "I'm sorry, I couldn't generate a response.";

    // 4. Save AI response to Firestore
    await addDoc(collection(db, "chat_history"), {
      userId: user.uid,
      subject: selectedSubject,
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Failed to send message", err);
    setError(err instanceof Error ? err.message : "An unexpected error occurred.");
  } finally {
    setLoading(false);
  }
};
