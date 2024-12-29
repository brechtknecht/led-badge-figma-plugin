// code.ts
figma.showUI(__html__, { width: 300, height: 500 });

interface PluginMessage {
  type: string;
  hex?: string;
  message?: string;
}

function isNodeBlack(node: SceneNode): boolean {
  if (node.type === "RECTANGLE" || node.type === "FRAME") {
    const fills = "fills" in node ? node.fills : null;
    if (fills && Array.isArray(fills) && fills.length > 0) {
      const fill = fills[0] as Paint;
      if (fill.type === "SOLID") {
        const solidFill = fill as SolidPaint;
        return (
          solidFill.color.r === 0 &&
          solidFill.color.g === 0 &&
          solidFill.color.b === 0
        );
      }
    }
  }
  return false;
}

function getPixelState(frame: FrameNode): boolean[][] {
  const grid: boolean[][] = Array(11)
    .fill(null)
    .map(() => Array(11).fill(false));

  const children = frame.findChildren(
    (node) => node.type === "RECTANGLE" || node.type === "FRAME",
  );

  children.forEach((node) => {
    const gridX = Math.floor(node.x / 10);
    const gridY = Math.floor(node.y / 10);

    if (gridX >= 0 && gridX < 11 && gridY >= 0 && gridY < 11) {
      if (isNodeBlack(node)) {
        grid[gridY][gridX] = true;
      }
    }
  });

  return grid;
}

function gridToHex(grid: boolean[][]): string {
  let result = "";

  // Process 11 rows
  for (let y = 0; y < 11; y++) {
    let rowBinary = "";

    // Create 8-bit row
    for (let x = 0; x < 8; x++) {
      // Get value from our 11x11 grid, but only use first 8 columns
      // Add offset of 1 to center horizontally
      const gridX = x + 1;
      rowBinary += gridX < grid[0].length && grid[y][gridX] ? "1" : "0";
    }

    // Convert 8-bit binary to 2-character hex
    const rowHex = parseInt(rowBinary, 2)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
    result += rowHex;
  }

  return result;
}

figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 1 && selection[0].type === "FRAME") {
    const frame = selection[0] as FrameNode;

    if (Math.round(frame.width) === 110 && Math.round(frame.height) === 110) {
      const grid = getPixelState(frame);
      const hex = gridToHex(grid);

      figma.ui.postMessage({ type: "update-preview", hex } as PluginMessage);
    } else {
      figma.ui.postMessage({
        type: "error",
        message: "Frame must be 110x110px",
      } as PluginMessage);
    }
  }
});

figma.ui.onmessage = (msg: PluginMessage) => {
  if (msg.type === "copy-hex") {
    figma.notify("Hex code copied to clipboard!");
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
