export function handleError(error: Error): void {
  switch (error.name) {
    case 'GitRefNotFoundError':
      console.error(`Error: ${error.message}`);
      console.error('Hint: Run "mcp-changelog list-tags" to see available tags.');
      break;
    case 'InvalidRangeError':
      console.error(`Error: ${error.message}`);
      console.error('Hint: Use format "from..to", e.g. "v1.0.0..v2.0.0"');
      break;
    case 'GitFileNotFoundError':
      console.error(`Error: ${error.message}`);
      break;
    case 'SchemaNotFoundError':
      console.error(`Error: ${error.message}`);
      console.error('Hint: Use --schema-path to specify the schema location.');
      break;
    case 'SchemaParseError':
      console.error(`Error: ${error.message}`);
      console.error('Hint: Check that the file is valid JSON.');
      break;
    case 'ConfigNotFoundError':
      console.error(`Error: ${error.message}`);
      break;
    case 'ConfigValidationError':
      console.error(`Error: ${error.message}`);
      break;
    default:
      console.error(`Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
  }
  process.exit(1);
}
