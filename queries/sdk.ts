// Note: the "@anthropic-ai/claude-code" package has been renamed
// to "@anthropic-ai/claude-agent-sdk"
import { query } from "@anthropic-ai/claude-agent-sdk";

const prompt = "Add a description to the package.json file";

// 기본적으로 readonly
for await (const message of query({
  prompt,
  options: {
    // 해당 옵션을 주면 수정할 수 있는 권한이 부여됨
    allowedTools: ["Edit"]
    //  npm run sdk
  }
})) {
  console.log(JSON.stringify(message, null, 2));
}
