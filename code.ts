figma.showUI(__html__, { width: 320, height: 600 });

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
    // Remove any division or rounding that might cause offset
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
    // Process all 11 columns using two bytes, starting from index 0 (no offset)
    let rowBinary1 = "";
    let rowBinary2 = "";

    // First byte (8 bits), start from index 0
    for (let x = 0; x < 8; x++) {
      rowBinary1 += grid[y][x] ? "1" : "0";
    }

    // Second byte (3 remaining bits), continue where first byte left off
    for (let x = 8; x < 11; x++) {
      rowBinary2 += grid[y][x] ? "1" : "0";
    }

    // Convert both parts to hex
    const rowHex1 = parseInt(rowBinary1, 2)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
    const rowHex2 = parseInt(rowBinary2.padEnd(8, "0"), 2)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

    result += rowHex1 + rowHex2;
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
