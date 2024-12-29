figma.showUI(__html__, { width: 320, height: 600 });

interface PluginMessage {
  type: string;
  pixels?: string;
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
    // Round instead of floor to handle slight offsets
    const gridX = Math.round(node.x / 10);
    const gridY = Math.round(node.y / 10);

    // Shift the grid position left by 1 to correct offset
    const adjustedX = Math.max(0, gridX - 1);

    if (adjustedX >= 0 && adjustedX < 11 && gridY >= 0 && gridY < 11) {
      if (isNodeBlack(node)) {
        grid[gridY][adjustedX] = true;
      }
    }
  });

  return grid;
}

function gridToString(grid: boolean[][]): string {
  return grid
    .map((row) => row.map((pixel) => (pixel ? "0" : "-")).join(""))
    .join("\n");
}

figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && selection[0].type === "FRAME") {
    const frame = selection[0] as FrameNode;
    if (Math.round(frame.width) === 110 && Math.round(frame.height) === 110) {
      const grid = getPixelState(frame);
      const pixels = gridToString(grid);
      figma.ui.postMessage({ type: "update-preview", pixels } as PluginMessage);
    } else {
      figma.ui.postMessage({
        type: "error",
        message: "Frame must be 110x110px",
      } as PluginMessage);
    }
  }
});

figma.ui.onmessage = (msg: PluginMessage) => {
  if (msg.type === "copy-pixels") {
    figma.notify("Pixel string copied to clipboard!");
  } else if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
