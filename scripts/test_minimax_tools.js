/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const apiKey = process.env.MINIMAX_PLAN_KEY;
if (!apiKey) {
  console.error('Error: MINIMAX_PLAN_KEY is not set.');
  process.exit(1);
}

async function run() {
  const url = 'https://api.minimax.io/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      messages: [
        {
          role: 'user',
          content:
            'What files are in the current directory? Use the list_dir tool to check.',
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'list_dir',
            description: 'List the contents of a directory',
            parameters: {
              type: 'object',
              properties: {
                DirectoryPath: {
                  type: 'string',
                  description: 'Path to list contents of',
                },
              },
              required: ['DirectoryPath'],
            },
          },
        },
      ],
      stream: true,
      reasoning_split: true,
    }),
  });

  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    console.log('--- CHUNK START ---');
    console.log(text);
    console.log('--- CHUNK END ---');
  }

  console.log('Stream ended.');
}

run().catch(console.error);
