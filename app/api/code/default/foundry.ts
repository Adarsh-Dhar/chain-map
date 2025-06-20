export const basePrompt = `<boltArtifact id=\"project-import\" title=\"Project Files\"><boltAction type=\"file\" filePath=\"foundry.toml\">[default]
src = 'src'
test = 'test'
libraries = ['lib']
</boltAction><boltAction type=\"file\" filePath=\"README.md\"># Foundry Minimal Project\n\nThis is a minimal Foundry project with a Counter contract and test.\n\n## Usage\n\n- Install Foundry: https://book.getfoundry.sh/getting-started/installation\n- Build: \`forge build\`\n- Test: \`forge test\`\n</boltAction><boltAction type=\"file\" filePath=\"src/Counter.sol\">// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.13;\n\ncontract Counter {\n    uint256 public number;\n\n    function setNumber(uint256 newNumber) public {\n        number = newNumber;\n    }\n\n    function increment() public {\n        number++;\n    }\n}\n</boltAction><boltAction type=\"file\" filePath=\"test/Counter.t.sol\">// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.13;\n\nimport \"forge-std/Test.sol\";\nimport \"../src/Counter.sol\";\n\ncontract CounterTest is Test {\n    Counter public counter;\n\n    function setUp() public {\n        counter = new Counter();\n        counter.setNumber(0);\n    }\n\n    function testIncrement() public {\n        counter.increment();\n        assertEq(counter.number(), 1);\n    }\n\n    function testSetNumber(uint256 x) public {\n        counter.setNumber(x);\n        assertEq(counter.number(), x);\n    }\n}\n</boltAction></boltArtifact>`;

export function generateFoundryPrompt(userPrompt: string): string {
  // Simple keyword-based template selection for demo
  if (/simplestorage/i.test(userPrompt)) {
    return `<boltArtifact id="project-import" title="Project Files"><boltAction type="file" filePath="foundry.toml">[default]
src = 'src'
test = 'test'
libraries = ['lib']
</boltAction><boltAction type="file" filePath="README.md"># Foundry Minimal Project\n\nThis is a minimal Foundry project with a SimpleStorage contract and test.\n\n## Usage\n\n- Install Foundry: https://book.getfoundry.sh/getting-started/installation\n- Build: \`forge build\`\n- Test: \`forge test\`\n</boltAction><boltAction type="file" filePath="src/SimpleStorage.sol">// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\n\ncontract SimpleStorage {\n    uint256 private storedData;\n\n    function set(uint256 x) public {\n        storedData = x;\n    }\n\n    function get() public view returns (uint256) {\n        return storedData;\n    }\n}\n</boltAction><boltAction type="file" filePath="test/SimpleStorage.t.sol">// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\n\nimport \"forge-std/Test.sol\";\nimport \"../src/SimpleStorage.sol\";\n\ncontract SimpleStorageTest is Test {\n    SimpleStorage public simpleStorage;\n\n    function setUp() public {\n        simpleStorage = new SimpleStorage();\n    }\n\n    function testSetAndGet() public {\n        simpleStorage.set(42);\n        assertEq(simpleStorage.get(), 42);\n    }\n}\n</boltAction></boltArtifact>`;
  }
  // Fallback to Counter contract
  return basePrompt;
}

export function getFoundrySystemPrompt(userPrompt: string): string {
  return `You are an expert Solidity and Foundry developer. Given the following user request, generate a minimal Foundry project. The project must include:

1. foundry.toml
2. README.md
3. A single Solidity contract in src/ (named appropriately)
4. A test file in test/ using Foundry's Forge framework

Use Solidity version ^0.8.0. Keep the code as simple and clean as possible, without extra comments or modifiers.

**IMPORTANT INSTRUCTIONS:**
- DO NOT use markdown or triple backticks anywhere in your response.
- DO NOT add any explanations or text outside the code files.
- ONLY output the code files using the <boltArtifact> and <boltAction> tags as shown below.
- Each file MUST be in its own <boltAction type="file" filePath="..."></boltAction> block.
- The output MUST be ready for parsing and file creation.

Format example:
<boltArtifact id="project-import" title="Project Files">
<boltAction type="file" filePath="foundry.toml">[foundry.toml contents]</boltAction>
<boltAction type="file" filePath="README.md">[README contents]</boltAction>
<boltAction type="file" filePath="src/ContractName.sol">[Solidity contract]</boltAction>
<boltAction type="file" filePath="test/ContractName.t.sol">[Test file]</boltAction>
</boltArtifact>

User request: ${userPrompt}`;
}
