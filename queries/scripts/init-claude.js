import fs from "fs";
import path from "path";

// Get the current working directory
const pwd = process.cwd();

// Define file paths
const templatePath = path.join(".claude", "settings.example.json");
const outputPath = path.join(".claude", "settings.local.json");

try {
  // Read the template file
  const templateContent = fs.readFileSync(templatePath, "utf8");

  // Escape backslashes for JSON
  const escapedPwd = pwd.replace(/\\/g, "\\\\");

  // Replace all instances of $PWD with the escaped working directory
  const processedContent = templateContent.replace(/\$PWD/g, escapedPwd);

  // Parse to validate JSON
  JSON.parse(processedContent);

  // Ensure .claude directory exists
  const claudeDir = path.dirname(outputPath);
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Write the processed content to settings.local.json
  fs.writeFileSync(outputPath, processedContent, "utf8");

  console.log(`✅ Successfully created ${outputPath}`);
  console.log(`   Replaced $PWD with: ${pwd}`);
} catch (error) {
  if (error.code === "ENOENT") {
    console.error(`❌ Error: Could not find ${templatePath}`);
    console.error(
      "   Make sure you run this script from the project root directory.",
    );
  } else if (error instanceof SyntaxError) {
    console.error("❌ Error: Invalid JSON after processing");
    console.error(error.message);
  } else {
    console.error("❌ Error:", error.message);
  }
  process.exit(1);
}
