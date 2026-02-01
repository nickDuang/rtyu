export interface ParsedCharacter {
  name: string;
  description: string;
  avatar: string;
}

const readTextChunk = (data: Uint8Array): string => {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(data);
};

export const parseCharacterCard = async (file: File): Promise<ParsedCharacter | null> => {
  if (file.type === "application/json") {
    const text = await file.text();
    const json = JSON.parse(text);
    // Handle different JSON card formats (V1, V2, etc.)
    const data = json.data || json;
    return {
      name: data.name || "Unknown",
      description: data.description || data.persona || "",
      avatar: "https://picsum.photos/200", // Default or placeholder
    };
  } else if (file.type === "image/png") {
    return await parsePng(file);
  }
  return null;
};

const parsePng = async (file: File): Promise<ParsedCharacter | null> => {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);

  // Check PNG signature
  if (dataView.getUint32(0) !== 0x89504e47 || dataView.getUint32(4) !== 0x0d0a1a0a) {
    throw new Error("Invalid PNG file");
  }

  let offset = 8;
  let characterJson: any = null;

  while (offset < dataView.byteLength) {
    const length = dataView.getUint32(offset);
    const type = String.fromCharCode(
      dataView.getUint8(offset + 4),
      dataView.getUint8(offset + 5),
      dataView.getUint8(offset + 6),
      dataView.getUint8(offset + 7)
    );

    if (type === "tEXt") {
      const chunkData = new Uint8Array(arrayBuffer, offset + 8, length);
      let text = "";
      for (let i = 0; i < chunkData.length; i++) {
        text += String.fromCharCode(chunkData[i]);
      }

      // Tavern cards use "chara" keyword + null separator + base64 data
      const keyword = "chara" + String.fromCharCode(0);
      if (text.startsWith(keyword)) {
        const base64Data = text.substring(keyword.length);
        try {
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decodedString = new TextDecoder("utf-8").decode(bytes);
          characterJson = JSON.parse(decodedString);
          break; // Found the data
        } catch (e) {
          console.error("Failed to decode character data", e);
        }
      }
    }

    if (type === "IEND") break;
    offset += 12 + length;
  }

  // Get Avatar as Base64
  const reader = new FileReader();
  const avatarBase64 = await new Promise<string>((resolve) => {
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });

  if (characterJson) {
     const data = characterJson.data || characterJson;
     return {
        name: data.name || "Unknown",
        description: data.description || data.persona || "",
        avatar: avatarBase64
     };
  }
  
  // Fallback if no metadata found but valid image
  return {
      name: file.name.replace('.png', ''),
      description: '',
      avatar: avatarBase64
  };
};