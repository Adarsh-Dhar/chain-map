"use client"

import React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Square, Circle, Diamond, Trash2, ArrowRight, MousePointer, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Component {
  id: string
  type: "contract" | "data" | "datafeed" | "arrow"
  x: number
  y: number
  label?: string
  name?: string
  chain?: string
  content?: string
}

interface Connection {
  id: string
  fromId: string
  toId: string
  fromPoint: { x: number; y: number }
  toPoint: { x: number; y: number }
}

interface DataFeed {
  name: string
  address: string
}

interface CodeServerInfo {
  url: string;
  password: string;
}

const dataFeeds: DataFeed[] = [
  { name: "AUD / USD", address: "0xB0C712f98daE15264c8E26132BCC91C40aD4d5F9" },
  { name: "BTC / ETH", address: "0x5fb1616F78dA7aFC9FF79e0371741a747D2a7F22" },
  { name: "BTC / USD", address: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43" },
  { name: "CSPX / USD", address: "0x4b531A318B0e44B549F3b2f824721b3D0d51930A" },
  { name: "CZK / USD", address: "0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA" },
  { name: "DAI / USD", address: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19" },
  { name: "ETH / USD", address: "0x694AA1769357215DE4FAC081bf1f309aDC325306" },
  { name: "EUR / USD", address: "0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910" },
]

const chains = [
  { value: "sepolia", label: "Sepolia", color: "bg-blue-500" },
  { value: "arbitrum", label: "Arbitrum", color: "bg-purple-500" },
  { value: "optimism", label: "Optimism", color: "bg-red-500" },
  { value: "base", label: "Base", color: "bg-green-500" },
]

export default function DiagramApp() {
  const [components, setComponents] = useState<Component[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [draggedComponent, setDraggedComponent] = useState<Component | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionStart, setConnectionStart] = useState<Component | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [editingContract, setEditingContract] = useState<Component | null>(null)
  const [contractName, setContractName] = useState("")
  const [selectedChain, setSelectedChain] = useState("sepolia")
  const [contractContent, setContractContent] = useState("")
  const [editingData, setEditingData] = useState<Component | null>(null)
  const [dataContent, setDataContent] = useState("")
  const [showCCIPDialog, setShowCCIPDialog] = useState(false)
  const [ccipCode, setCCIPCode] = useState<string>("")
  const [ccipLoading, setCCIPLoading] = useState(false)
  const [ccipError, setCCIPError] = useState<string | null>(null)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [password, setPassword] = useState("")
  const [isCreatingCodeServer, setIsCreatingCodeServer] = useState(false)
  const [codeServerInfo, setCodeServerInfo] = useState<CodeServerInfo | null>(null)

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      toast({
        title: "Copied to clipboard",
        description: "Address copied successfully",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleDragStart = (e: React.DragEvent, type: "contract" | "data" | "datafeed" | "arrow", label?: string) => {
    e.dataTransfer.setData("componentType", type)
    if (label) {
      e.dataTransfer.setData("componentLabel", label)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const componentType = e.dataTransfer.getData("componentType") as "contract" | "data" | "datafeed" | "arrow"
    const componentLabel = e.dataTransfer.getData("componentLabel")

    const newComponent: Component = {
      id: Date.now().toString(),
      type: componentType,
      x: e.clientX - rect.left - 50,
      y: e.clientY - rect.top - 25,
      label: componentLabel || componentType,
    }

    setComponents((prev) => [...prev, newComponent])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleComponentClick = (component: Component) => {
    if (connectionMode) {
      if (!connectionStart) {
        setConnectionStart(component)
        toast({
          title: "Connection started",
          description: "Click another component to complete the connection",
        })
      } else if (connectionStart.id !== component.id) {
        // Create connection
        const newConnection: Connection = {
          id: Date.now().toString(),
          fromId: connectionStart.id,
          toId: component.id,
          fromPoint: getComponentCenter(connectionStart),
          toPoint: getComponentCenter(component),
        }
        setConnections((prev) => [...prev, newConnection])
        setConnectionStart(null)
        setConnectionMode(false)
        toast({
          title: "Connection created",
          description: "Components connected successfully",
        })
      }
    }
  }

  const getComponentCenter = (component: Component) => {
    switch (component.type) {
      case "contract":
        return { x: component.x + 48, y: component.y + 32 }
      case "data":
        return { x: component.x + 40, y: component.y + 40 }
      case "datafeed":
        return { x: component.x + 48, y: component.y + 32 }
      case "arrow":
        return { x: component.x + 30, y: component.y + 15 }
      default:
        return { x: component.x + 25, y: component.y + 25 }
    }
  }

  const updateConnectionPoints = (componentId: string, newX: number, newY: number) => {
    const component = components.find((c) => c.id === componentId)
    if (!component) return

    const updatedComponent = { ...component, x: newX, y: newY }
    const newCenter = getComponentCenter(updatedComponent)

    setConnections((prev) =>
      prev.map((conn) => {
        if (conn.fromId === componentId) {
          return { ...conn, fromPoint: newCenter }
        }
        if (conn.toId === componentId) {
          return { ...conn, toPoint: newCenter }
        }
        return conn
      }),
    )
  }

  const handleComponentMouseDown = (e: React.MouseEvent, component: Component) => {
    if (connectionMode) {
      handleComponentClick(component)
      return
    }

    e.preventDefault()
    setDraggedComponent(component)
    setIsDragging(true)

    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - component.x,
        y: e.clientY - rect.top - component.y,
      })
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !draggedComponent || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const newX = Math.max(0, e.clientX - rect.left - dragOffset.x)
      const newY = Math.max(0, e.clientY - rect.top - dragOffset.y)

      setComponents((prev) =>
        prev.map((comp) => (comp.id === draggedComponent.id ? { ...comp, x: newX, y: newY } : comp)),
      )

      updateConnectionPoints(draggedComponent.id, newX, newY)
    },
    [isDragging, draggedComponent, dragOffset, components],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedComponent(null)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const deleteComponent = (id: string) => {
    setComponents((prev) => prev.filter((comp) => comp.id !== id))
    setConnections((prev) => prev.filter((conn) => conn.fromId !== id && conn.toId !== id))
  }

  const clearCanvas = () => {
    setComponents([])
    setConnections([])
    setConnectionStart(null)
    setConnectionMode(false)
  }

  const toggleConnectionMode = () => {
    setConnectionMode(!connectionMode)
    setConnectionStart(null)
    if (!connectionMode) {
      toast({
        title: "Connection mode enabled",
        description: "Click on components to connect them",
      })
    }
  }

  const renderArrow = (connection: Connection) => {
    const { fromPoint, toPoint } = connection
    const dx = toPoint.x - fromPoint.x
    const dy = toPoint.y - fromPoint.y
    const angle = Math.atan2(dy, dx)

    // Shorten the line to not overlap with component borders
    const shortenBy = 25
    const length = Math.sqrt(dx * dx + dy * dy)
    const shortenedLength = length - shortenBy * 2

    const startX = fromPoint.x + (shortenBy * dx) / length
    const startY = fromPoint.y + (shortenBy * dy) / length
    const endX = toPoint.x - (shortenBy * dx) / length
    const endY = toPoint.y - (shortenBy * dy) / length

    return (
      <g key={connection.id}>
        <defs>
          <marker id={`arrowhead-${connection.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth="2"
          markerEnd={`url(#arrowhead-${connection.id})`}
        />
      </g>
    )
  }

  const openContractEditor = (component: Component) => {
    setEditingContract(component)
    setContractName(component.name || "")
    setSelectedChain(component.chain || "sepolia")
    setContractContent(component.content || "")
  }

  const openDataEditor = (component: Component) => {
    setEditingData(component)
    setDataContent(component.content || "")
  }

  const saveContractChanges = async () => {
    console.log("Saving contract changes:", contractContent)
    if (!editingContract) return

    setComponents((prev) =>
      prev.map((comp) =>
        comp.id === editingContract.id ? { ...comp, name: contractName, chain: selectedChain, content: contractContent } : comp,
      ),
    )
    setEditingContract(null)

    // Call LLM API with contractContent as prompt
    if (contractContent && contractContent.trim().length > 0) {
      try {
        const response = await fetch("/api/code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: contractContent }),
        })
        const data = await response.json()
        console.log("LLM Response:", data)
        toast({
          title: "LLM Response",
          description: data.artifact ? data.artifact.slice(0, 300) + (data.artifact.length > 300 ? '...' : '') : "No artifact returned.",
          variant: "default",
        })
      } catch (err) {
        console.error("Failed to fetch LLM response:", err)
        toast({
          title: "LLM Error",
          description: "Failed to fetch LLM response.",
          variant: "destructive",
        })
      }
    }
  }

  const saveDataChanges = () => {
    if (!editingData) return;
    console.log('Saving data node:', editingData.id, 'with content:', dataContent);
    setComponents((prev) => {
      const updated = prev.map((comp) =>
        comp.id === editingData.id ? { ...comp, content: dataContent } : comp
      );
      console.log('Updated components after data save:', updated);
      return updated;
    });
    setEditingData(null);
  }

  const renderComponent = (component: Component) => {
    const baseClasses = `absolute cursor-move border-2 ${
      connectionMode ? "border-blue-500 hover:border-blue-600 hover:shadow-lg" : "border-gray-400 hover:border-blue-500"
    } bg-white shadow-lg flex items-center justify-center text-sm font-medium select-none group transition-all duration-200`

    const clickHandler = connectionMode
      ? () => handleComponentClick(component)
      : (e: React.MouseEvent) => handleComponentMouseDown(e, component)

    switch (component.type) {
      case "contract":
        const chainInfo = chains.find((c) => c.value === component.chain) || chains[0]
        return (
          <div
            key={component.id}
            className={`${baseClasses} w-32 h-20 rounded flex-col`}
            style={{ left: component.x, top: component.y }}
            onMouseDown={clickHandler}
          >
            <div className="flex items-center mb-1">
              <Square className="w-3 h-3 mr-1" />
              <span className="text-xs font-semibold">Contract</span>
            </div>
            <div className="text-xs font-medium text-center mb-1">{component.name || "Unnamed"}</div>
            {component.content && (
              <div className="text-xs text-gray-500 text-center mb-1 whitespace-pre-line">{component.content}</div>
            )}
            <div className={`text-xs px-2 py-1 rounded text-white ${chainInfo.color}`}>{chainInfo.label}</div>
            {!connectionMode && (
              <>
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteComponent(component.id)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation()
                    openContractEditor(component)
                  }}
                >
                  ✏️
                </button>
              </>
            )}
          </div>
        )
      case "data":
        return (
          <div
            key={component.id}
            className={`${baseClasses} w-20 h-20 rounded-full`}
            style={{ left: component.x, top: component.y }}
            onMouseDown={clickHandler}
          >
            <Circle className="w-4 h-4 mr-1" />
            <span className="text-xs">Data</span>
            {component.content && (
              <div className="text-xs text-gray-500 text-center mt-1 whitespace-pre-line">{component.content}</div>
            )}
            {!connectionMode && (
              <>
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteComponent(component.id)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation()
                    openDataEditor(component)
                  }}
                >
                  ✏️
                </button>
              </>
            )}
          </div>
        )
      case "datafeed":
        return (
          <div
            key={component.id}
            className={`${baseClasses} w-24 h-16 transform rotate-45`}
            style={{ left: component.x, top: component.y }}
            onMouseDown={clickHandler}
          >
            <div className="transform -rotate-45 flex flex-col items-center">
              <Diamond className="w-4 h-4" />
              <span className="text-xs mt-1">{component.label}</span>
            </div>
            {!connectionMode && (
              <button
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center transform -rotate-45"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteComponent(component.id)
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )
      case "arrow":
        return (
          <div
            key={component.id}
            className={`${baseClasses} w-16 h-8 rounded-full bg-orange-100`}
            style={{ left: component.x, top: component.y }}
            onMouseDown={clickHandler}
          >
            <ArrowRight className="w-4 h-4 text-orange-600" />
            {!connectionMode && (
              <button
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteComponent(component.id)
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )
      default:
        return null
    }
  }

  // Find CCIP pattern: sender is contract where arrow starts, receiver is where arrow ends, all other contracts are extra
  const findCCIPPattern = () => {
    // Find all arrows (connections from contract to contract or data)
    const arrowConnections = connections.filter(conn => {
      const from = components.find(c => c.id === conn.fromId);
      const to = components.find(c => c.id === conn.toId);
      return from && to && from.type === "contract" && (to.type === "contract" || to.type === "data");
    });
    if (arrowConnections.length === 0) return null;
    // Assume first arrow is the main CCIP flow
    const mainArrow = arrowConnections[0];
    const sender = components.find(c => c.id === mainArrow.fromId && c.type === "contract");
    const receiver = components.find(c => c.id === mainArrow.toId && c.type === "contract");
    // Find data node (if any) between sender and receiver
    let dataNode = components.find(c => c.type === "data" && connections.some(conn => conn.fromId === sender?.id && conn.toId === c.id) && connections.some(conn => conn.fromId === c.id && conn.toId === receiver?.id));
    // If no data node, just use a default
    if (!dataNode) dataNode = { id: "data", type: "data", x: 0, y: 0, content: "hello world" };
    // All other contracts are extra
    const extraContracts = components.filter(c => c.type === "contract" && c.id !== sender?.id && c.id !== receiver?.id);
    return { sender, dataNode, receiver, extraContracts };
  };

  const ccipPattern = findCCIPPattern();

  // Generate prompt for LLM
  const generateCCIPPrompt = (
    sender: Component | undefined,
    dataNode: Component | undefined,
    receiver: Component | undefined
  ) => {
    const message = dataNode?.content?.trim() ? dataNode.content : "hello world";
    const senderName = sender?.name || "Sender";
    const receiverName = receiver?.name || "Receiver";

    return `You are an expert Solidity and Foundry developer.
Generate two complete and separate Foundry projects for a Chainlink CCIP interaction.

**Project 1: Sender**
- Contract Name: ${senderName}
- Chain: ${sender?.chain || "source chain"}
- Purpose: Sends a message via CCIP.
- Message to send: "${message}"

**Project 2: Receiver**
- Contract Name: ${receiverName}
- Chain: ${receiver?.chain || "destination chain"}
- Purpose: Receives a message from the Sender via CCIP.

For EACH project, you must generate:
1. A Foundry project folder named after the contract (e.g., '${senderName}/' and '${receiverName}/').
2. Inside each folder, provide:
   - \`foundry.toml\`
   - \`README.md\`
   - \`src/${senderName}.sol\` or \`src/${receiverName}.sol\` containing the respective contract. The contract name inside the file MUST match the filename.
   - \`test/${senderName}.t.sol\` or \`test/${senderName}.t.sol\` with a basic test for the contract.

Use Solidity version ^0.8.19.

**IMPORTANT INSTRUCTIONS:**
- DO NOT use markdown or triple backticks anywhere in your response.
- DO NOT add any explanations or text outside the code files.
- The entire output must be a single <boltArtifact> block.
- Each file MUST be in its own <boltAction type="file" filePath="..."></boltAction> block, with the correct file path including the project folder.

Example for the Sender project (and similarly for the Receiver):
<boltAction type="file" filePath="${senderName}/foundry.toml">[foundry.toml contents]</boltAction>
<boltAction type="file" filePath="${senderName}/README.md">[README contents]</boltAction>
<boltAction type="file" filePath="${senderName}/src/${senderName}.sol">[Solidity contract]</boltAction>
<boltAction type="file" filePath="${senderName}/test/${senderName}.t.sol">[Test file]</boltAction>
`;
  };

  // Handler for generating CCIP contracts
  const handleGenerateCCIP = async () => {
    if (!ccipPattern) return;
    setCCIPLoading(true);
    setCCIPError(null);
    setShowCCIPDialog(true);
    // Log the data node content and the prompt
    console.log("Data node content:", ccipPattern.dataNode?.content);
    const prompt = generateCCIPPrompt(ccipPattern.sender, ccipPattern.dataNode, ccipPattern.receiver);
    console.log("Prompt sent to LLM:\n", prompt);

    // Build contractDataFeeds object
    const contractDataFeeds: Record<string, { name: string; address: string }[]> = {};
    components.forEach(comp => {
      if (comp.type === 'contract') {
        const connectedFeeds = connections
          .filter(conn => conn.toId === comp.id)
          .map(conn => components.find(c => c.id === conn.fromId && c.type === 'datafeed'))
          .filter(Boolean)
          .map(feed => ({
            name: feed!.label!,
            address: dataFeeds.find(df => df.name === feed!.label)?.address || ''
          }))
          .filter(feed => feed.address);
        if (connectedFeeds.length > 0) {
          contractDataFeeds[comp.name || comp.id] = connectedFeeds;
        }
      }
    });

    try {
      const response = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, contractDataFeeds }),
      });
      const data = await response.json();
      
      // Set the code for display in the dialog
      setCCIPCode(data.artifact || "No code returned.");
      
      // Write the code to files using code-server
      if (data.artifact) {
        try {
          const writeResponse = await fetch("/api/code-server", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompts: [data.artifact],
              config: {
                baseDir: "generated/ccip",
              }
            }),
          });
          
          if (!writeResponse.ok) {
            throw new Error("Failed to write code files");
          }
          
          toast({
            title: "Success",
            description: "CCIP Foundry projects have been generated in the generated/ccip directory",
          });
        } catch (writeErr) {
          console.error("Failed to write code files:", writeErr);
          toast({
            title: "Error",
            description: "Failed to save the generated code files",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      setCCIPError("Failed to fetch generated code.");
      setCCIPCode("");
    } finally {
      setCCIPLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">FlowDiagram</h2>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Component Palette */}
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="text-lg">Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, "contract")}
              className="flex items-center p-3 border border-gray-200 rounded cursor-move hover:bg-gray-50 transition-colors"
            >
              <Square className="w-5 h-5 mr-3 text-blue-600" />
              <span>Contract (Rectangle)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, "data")}
              className="flex items-center p-3 border border-gray-200 rounded cursor-move hover:bg-gray-50 transition-colors"
            >
              <Circle className="w-5 h-5 mr-3 text-green-600" />
              <span>Data (Circle)</span>
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, "arrow")}
              className="flex items-center p-3 border border-gray-200 rounded cursor-move hover:bg-gray-50 transition-colors"
            >
              <ArrowRight className="w-5 h-5 mr-3 text-orange-600" />
              <span>Arrow (Connector)</span>
            </div>
          </CardContent>
        </Card>

        {/* Data Feeds */}
        <Card className="m-4 flex-1 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Data Feeds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 overflow-y-auto max-h-96">
            {dataFeeds.map((feed, index) => (
              <div key={index} className="border border-gray-200 rounded p-3">
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, "datafeed", feed.name)}
                  className="flex items-center justify-between cursor-move hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <div className="flex items-center">
                    <Diamond className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="font-medium">{feed.name}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-xs font-mono text-gray-600 truncate mr-2">{feed.address}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(feed.address)}
                    className="h-6 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Blockchain Data Flow Diagram</h1>
          <div className="flex gap-2">
            <Button
              onClick={toggleConnectionMode}
              variant={connectionMode ? "default" : "outline"}
              className={connectionMode ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {connectionMode ? <ArrowRight className="w-4 h-4 mr-2" /> : <MousePointer className="w-4 h-4 mr-2" />}
              {connectionMode ? "Connecting..." : "Connect"}
            </Button>
            <Button onClick={clearCanvas} variant="outline">
              Clear Canvas
            </Button>
            {ccipPattern && (
              <Button onClick={handleGenerateCCIP} variant="secondary">
                Generate CCIP Contracts
              </Button>
            )}
          </div>
        </div>

        <div
          ref={canvasRef}
          className="flex-1 relative bg-white overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            backgroundImage: `
              radial-gradient(circle, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        >
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map(renderArrow)}
          </svg>

          {components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-lg z-10">
              Drag components from the sidebar to start building your diagram
            </div>
          )}

          <div style={{ zIndex: 2, position: "relative" }}>{components.map(renderComponent)}</div>

          {connectionMode && connectionStart && (
            <div className="absolute top-4 left-4 bg-blue-100 border border-blue-300 rounded-lg p-3 z-20">
              <p className="text-sm text-blue-800">
                Connection started from <strong>{connectionStart.label}</strong>
                <br />
                Click another component to complete the connection
              </p>
            </div>
          )}
        </div>
        {editingContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Edit Contract</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contract Name</label>
                  <input
                    type="text"
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contract name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Deployment Chain</label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {chains.map((chain) => (
                      <option key={chain.value} value={chain.value}>
                        {chain.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={contractContent}
                    onChange={(e) => setContractContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contract content (optional)"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="outline" onClick={() => setEditingContract(null)}>
                  Cancel
                </Button>
                <Button onClick={saveContractChanges}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}
        {editingData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Edit Data</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={dataContent}
                    onChange={(e) => setDataContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter data content (optional)"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="outline" onClick={() => setEditingData(null)}>
                  Cancel
                </Button>
                <Button onClick={saveDataChanges}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}
        {/* CCIP Generated Code Dialog */}
        <Dialog open={showCCIPDialog} onOpenChange={(open) => {
          setShowCCIPDialog(open);
          if (!open) {
            setCodeServerInfo(null);
          }
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Generated CCIP Contracts</DialogTitle>
              <DialogDescription>
                Solidity code for sender and receiver contracts using Chainlink CCIP.
              </DialogDescription>
            </DialogHeader>
            {ccipLoading ? (
              <div className="text-center py-8 text-blue-500">Generating code...</div>
            ) : ccipError ? (
              <div className="text-center py-8 text-red-500">{ccipError}</div>
            ) : (
              <div className="space-y-4">
                <pre className="bg-gray-100 rounded p-4 overflow-x-auto text-xs max-h-96 whitespace-pre-wrap">
                  {ccipCode}
                </pre>
                {codeServerInfo ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-medium text-blue-900">VS Code Workspace</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">URL:</span>
                        <div className="flex items-center space-x-2">
                          <code className="bg-blue-100 px-2 py-1 rounded text-blue-900">{codeServerInfo.url}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.open(codeServerInfo.url, '_blank');
                            }}
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Password:</span>
                        <code className="bg-blue-100 px-2 py-1 rounded text-blue-900">
                          {codeServerInfo.password}
                        </code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        setIsCreatingCodeServer(true);
                        try {
                          const response = await fetch("/api/code-server/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              llmResponse: ccipCode
                            }),
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || "Failed to create workspace");
                          }
                          
                          const data = await response.json();
                          
                          if (data.url && data.password) {
                            setCodeServerInfo({
                              url: data.url,
                              password: data.password
                            });
                            
                            toast({
                              title: "Success",
                              description: "Workspace created successfully",
                            });
                          } else {
                            throw new Error("Invalid server response");
                          }
                        } catch (error: unknown) {
                          console.error("Workspace creation error:", error);
                          const errorMessage = error instanceof Error ? error.message : "Failed to create workspace";
                          toast({
                            title: "Error",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        } finally {
                          setIsCreatingCodeServer(false);
                        }
                      }}
                      disabled={isCreatingCodeServer}
                      variant="secondary"
                    >
                      {isCreatingCodeServer ? "Creating Workspace..." : "Create Workspace"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
