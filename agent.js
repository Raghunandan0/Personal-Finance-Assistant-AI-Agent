import readline from "node:readline/promises";
import Groq from "groq-sdk";

const expenseDB = [];
const incomeDB = [];

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function callAgent() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages = [
    {
      role: "system",
      content: `You are Josh, a personal finance assistant. Your task is to assist user with their expenses, balances, and financial planning.
      You have access to the following tools:
      1. getTotalExpense({from, to}): string  // Get total expense for a time period.
      2. addExpense({name, amount}): string   // Add new expense to the expense database.
      3. addIncome({name, amount}): string   // Add new income to income database.
      4. getMoneyBalance(): string  //Get remaining money balance from database.
      Current datetime: ${new Date().toUTCString()}`,
    },
  ];

  while (true) {
    const question = await rl.question("User: ");
    if (question.toLowerCase() === "bye") break;

    messages.push({ role: "user", content: question });

    while (true) {
      const completion = await groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
        tools: [
          {
            type: "function",
            function: {
              name: "getTotalExpense",
              description: "Get total expense from date to date.",
              parameters: {
                type: "object",
                properties: {
                  from: {
                    type: "string",
                    description: "From date to get the expense.",
                  },
                  to: {
                    type: "string",
                    description: "To date to get the expense.",
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "addExpense",
              description: "Add new expense entry to the expense database.",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the expense. e.g., Bought groceries.",
                  },
                  amount: {
                    type: "string",
                    description: "Amount of the expense.",
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "addIncome",
              description: "Add new income entry to income database.",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the income. e.g., Got salary.",
                  },
                  amount: {
                    type: "string",
                    description: "Amount of the income.",
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "getMoneyBalance",
              description: "Get remaining money balance from database.",
              parameters: {
                type: "object",
                properties: {},
              },
            },
          },
        ],
      });

      const message = completion.choices[0].message;
      messages.push(message);

      const toolCalls = message.tool_calls;
      if (!toolCalls) {
        console.log(`Assistant: ${message.content}`);
        break;
      }

      for (const tool of toolCalls) {
        const functionName = tool.function.name;
        const functionArgs = JSON.parse(tool.function.arguments || "{}");

        let result = "";
        if (functionName === "getTotalExpense") {
          result = getTotalExpense(functionArgs);
        } else if (functionName === "addExpense") {
          result = addExpense(functionArgs);
        } else if (functionName === "addIncome") {
          result = addIncome(functionArgs);
        } else if (functionName === "getMoneyBalance") {
          result = getMoneyBalance(); // No args expected
        }

        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tool.id,
        });
      }
    }
  }

  rl.close();

  // TOOL FUNCTIONS

  function getTotalExpense({ from, to }) {
    const total = expenseDB.reduce((acc, item) => acc + item.amount, 0);
    return `Total expenses between ${from} and ${to}: ${total} INR`;
  }

  function addExpense({ name, amount }) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return "Invalid amount provided.";
    expenseDB.push({ name, amount: parsedAmount });
    return `Added expense: ${name} - ₹${parsedAmount}`;
  }

  function addIncome({ name, amount }) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return "Invalid amount provided.";
    incomeDB.push({ name, amount: parsedAmount });
    return `Added income: ${name} - ₹${parsedAmount}`;
  }

  function getMoneyBalance() {
    const totalIncome = incomeDB.reduce((acc, item) => acc + item.amount, 0);
    const totalExpense = expenseDB.reduce((acc, item) => acc + item.amount, 0);
    const balance = totalIncome - totalExpense;
    return `Current balance: ₹${balance}`;
  }
}

callAgent();
