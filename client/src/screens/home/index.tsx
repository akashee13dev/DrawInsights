import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ActionIcon, Button, ColorSwatch, Container, Group, Modal, Tooltip} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

const SWATCHES = [
  "rgb(0,0,0)",
  "rgb(255,0,0)",
  "rgb(0,128,0)",
  "rgb(0,0,255)",
  "rgb(255,165,0)",
];

interface GeneratedResponse {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign?: boolean;
}

export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [infoOpened, setInfoOpened] = useState(false);
  const [color, setColor] = useState("rgb(0,0,0)");
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<GeneratedResponse | undefined>(undefined);
  const [latexItems, setLatexItems] = useState<
    { id: number; expression: string; position: { x: number; y: number } }[]
  >([]);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [dicOfVars, setDicOfVars] = useState<Record<string, string>>({});
  const draggedId = useRef<number | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Show popup for 2 seconds
  const showPopup = (msg: string) => {
    setPopupMessage(msg);
    setTimeout(() => setPopupMessage(null), 2000);
  };

  // Initialize canvas size and load MathJax once
  useEffect(() => {
    const canva = canvas.current;
    if (!canva) return;

    const dpr = window.devicePixelRatio || 1;
    canva.width = window.innerWidth * dpr;
    canva.height = window.innerHeight * dpr;
    canva.style.width = `${window.innerWidth}px`;
    canva.style.height = `${window.innerHeight}px`;

    const ctx = canva.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "square";
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctxRef.current = ctx;
    }

    // Only load once
    if (!(window as any).MathJax) {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
        script.async = true;
        script.onload = () => {
          (window as any).MathJax.Hub.Config({
            tex2jax: {
              inlineMath: [["$", "$"], ["\\(", "\\)"]],
            },
            skipStartupTypeset: true,
          });

          const target = document.getElementById("container");
          if (target) {
            MathJax.Hub.Queue(["Typeset", target]);
            }
        };
        document.head.appendChild(script);
      } else {
        const target = document.getElementById("container");
          if (target) {
            MathJax.Hub.Queue(["Typeset", target]);
            }
        // If already loaded, just typeset
      }
  }, []);

  // Update strokeStyle when color changes
  useEffect(() => {
    if (!ctxRef.current) return;
    ctxRef.current.strokeStyle = color;
  }, [color]);

  // Reset canvas when reset flag is true
  useEffect(() => {
    if (reset) {
      resetCanvas();
      setResult(undefined);
      setLatexItems([]);
      setDicOfVars({});
      setReset(false);
    }
  }, [reset]);

  const resetCanvas = () => {
    const canva = canvas.current;
    const ctx = ctxRef.current;
    if (!canva || !ctx) return;

    ctx.clearRect(0, 0, canva.width, canva.height);
    ctx.lineCap = "square";
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canva = canvas.current;
    const ctx = ctxRef.current;
    if (!canva || !ctx) return;
    const rect = canva.getBoundingClientRect();

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canva = canvas.current;
    const ctx = ctxRef.current;
    if (!canva || !ctx) return;
    const rect = canva.getBoundingClientRect();

    ctx.strokeStyle = color;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Function to render LaTeX expressions on canvas or elsewhere if you want
  const renderLatexToCanvas = (data: Response, idx: number) => {
    const canvasEl = canvas.current;
    if (!canvasEl) return;
  
    const centerX = canvasEl.clientWidth / 2;
    const centerY = canvasEl.clientHeight / 2;
  
    const wrappedExpr = `\\(${data.expr} = ${data.result}\\)`;
  
    setLatexItems(prev => [
      ...prev,
      {
        id: Date.now() + idx,
        expression: wrappedExpr,
        position: {
          x: centerX,
          y: centerY + idx * 40, // vertical spacing for stacking
        },
      },
    ]);
  
    // Trigger MathJax AFTER a small delay to ensure DOM updates
    setTimeout(() => {
        if ((window as any).MathJax?.Hub?.Queue) {
        (window as any).MathJax.Hub.Queue([
            "Typeset",
            (window as any).MathJax.Hub,
        ]);
        }
    }, 100);
  };  

  const sendData = async () => {
    const canva = canvas.current;
    const ctx = ctxRef.current;
    if (!canva || !ctx) return;

    const url = `${import.meta.env.VITE_API_URL}/calculate`; // Make sure you define this env var

    // Check if canvas is blank
    const imageData = ctx.getImageData(0, 0, canva.width, canva.height);
    const pixels = imageData.data;

    let isBlank = true;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] !== 0) {
        isBlank = false;
        break;
      }
    }
    if (isBlank) {
      showPopup("Canvas is empty. Please draw something first.");
      return;
    }

    try {
      const response = await axios.post(url, {
        image: canva.toDataURL("image/png"),
        dict_of_vars: dicOfVars,
      });

      const resp = response.data;

      // Example: resp.data should be an array of Response
      resp.data.forEach((data: Response) => {
        if (data.assign) {
          setDicOfVars((prev) => ({
            ...prev,
            [data.expr]: data.result,
          }));
        }
      });

      // Show each response expression and answer as draggable latex
      resp.data.forEach((data: Response, idx: number) => {
        console.log("data" ,data);
        console.log("DIC" ,dicOfVars);
        setTimeout(() => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
          renderLatexToCanvas(data , idx);
        }, 200 * idx);
      });

      resetCanvas();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Server error";
      showPopup("Server error: " + msg);
    }
  };

  // Drag & drop handlers for latex items
  const onDragStart = (
    e: React.MouseEvent<HTMLDivElement>,
    id: number
  ) => {
    draggedId.current = id;
    const item = latexItems.find((item) => item.id === id);
    if (!item) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedId.current === null) return;
    const canvaRect = canvas.current?.getBoundingClientRect();
    if (!canvaRect) return;

    const newX = e.clientX - canvaRect.left - dragOffset.current.x;
    const newY = e.clientY - canvaRect.top - dragOffset.current.y;

    setLatexItems((prev) =>
      prev.map((item) =>
        item.id === draggedId.current
          ? { ...item, position: { x: newX, y: newY } }
          : item
      )
    );
  };

  const onDragEnd = () => {
    draggedId.current = null;
  };

  return (
    <Container
      id="container"
      fluid
      style={{ position: "relative", height: "100vh", padding: 0 }}
      onMouseMove={onDrag}
      onMouseUp={onDragEnd}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded shadow-md"
        style={{ backgroundColor: "white", zIndex: 20, position: "relative" }}
      >
        <Group>
          {SWATCHES.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              onClick={() => setColor(c)}
              style={{
                cursor: "pointer",
                border: c === color ? "2px solid black" : undefined,
              }}
            />
          ))}
        </Group>

        <div className="flex flex-col items-center flex-grow px-4">
            <h1 className="font-extrabold text-2xl text-gray-900 tracking-wide">
                Akashee Drawing Intelligence
            </h1>
            <p className="mt-1 text-sm font-semibold text-gray-600 italic">
                by akashee13dev@gmail.com
            </p>
        </div>
        
        <Tooltip label="About this project" withArrow>
            <ActionIcon
              color="blue"
              variant="light"
              onClick={() => setInfoOpened(true)}
              size="lg"
              style={{ cursor: "pointer" }}
            >
              <IconInfoCircle size={20} />
            </ActionIcon>
          </Tooltip>

        <div className="flex gap-2">

            <Button onClick={() => setReset(true)} color="dark">
            Reset
            </Button>

            <Button onClick={sendData} color="dark">
            Calculate
            </Button>
        </div>
      </div>
      <Modal
        opened={infoOpened}
        onClose={() => setInfoOpened(false)}
        title="About Akashee Drawing Intelligence"
        size="md"
        centered
      >
        <p>
          This project connects Gemini AI with your drawing input to analyze and generate meaningful insights in real-time. It can calculate Math also . 
        </p>
        <p>
          Use the Reset button to clear your drawing and Calculate to trigger AI analysis.
        </p>
        <video
        controls
        width="100%"
        style={{ borderRadius: "8px", marginTop: "1rem" }}
        >
        <source src="/Sample.webm" type="video/webm" />
        Your browser does not support the video tag.
        </video>

      </Modal>

      <canvas
        ref={canvas}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={draw}
        style={{ zIndex: 1, cursor: "crosshair" }}
      />

      {latexItems.map((item) => (
        <div
          key={item.id}
          onMouseDown={(e) => onDragStart(e, item.id)}
          style={{
            position: "absolute",
            left: item.position.x,
            top: item.position.y,
            cursor: "move",
            userSelect: "none",
            padding: "4px 8px",
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: 6,
            boxShadow: "0 0 5px rgba(0,0,0,0.2)",
            fontSize: 20,
            color: "black",
            whiteSpace: "nowrap",
            zIndex: 100,
          }}
          dangerouslySetInnerHTML={{ __html: item.expression }}
        />
      ))}


      {popupMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#333",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
            zIndex: 10000,
            fontWeight: "600",
            fontSize: "16px",
            maxWidth: "300px",
            pointerEvents: "none",
            userSelect: "none",
            animation: "fadeInOut 2.5s forwards",
          }}
        >
          {popupMessage}
        </div>
      )}

    </Container>
  );
}
