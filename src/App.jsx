import { useEffect, useRef } from "react";
import Matter from "matter-js";

function App() {
  const sceneRef = useRef(null);

  useEffect(() => {
    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const Runner = Matter.Runner;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;

    const engine = Engine.create();

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 1200,
        height: 700,
        wireframes: false,
        background: "#111827"
      }
    });

    const ground = Bodies.rectangle(600, 680, 1200, 40, {
      isStatic: true,
      render: { fillStyle: "#4B5563" }
    });

    const box1 = Bodies.rectangle(400, 200, 80, 80, {
      render: { fillStyle: "#3B82F6" }
    });

    const box2 = Bodies.rectangle(500, 50, 80, 80, {
      render: { fillStyle: "#10B981" }
    });

    Composite.add(engine.world, [ground, box1, box2]);

    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "20px"
      }}
    >
      <div ref={sceneRef}></div>
    </div>
  );
}

export default App;