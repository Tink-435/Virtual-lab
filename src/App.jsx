import { useEffect, useRef } from "react";
import Matter from "matter-js";

function App() {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const mouseConstraintRef = useRef(null);

  useEffect(() => {
    const {
      Engine,
      Render,
      Runner,
      Bodies,
      Composite,
      Mouse,
      MouseConstraint,
    } = Matter;

    const engine = Engine.create();
    engine.gravity.y = 0.7;
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: 1200,
        height: 700,
        wireframes: false,
        background: "#111827",
      },
    });

    const ground = Bodies.rectangle(600, 680, 1200, 40, {
      isStatic: true,
      render: { fillStyle: "#4B5563" },
    });

    Composite.add(engine.world, ground);

    const mouse = Mouse.create(render.canvas);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.15,
        render: {
          visible: false,
        },
      },
    });

    mouseConstraintRef.current = mouseConstraint;

    Composite.add(engine.world, mouseConstraint);

    render.mouse = mouse;

    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Matter.World.clear(engine.world);
      Matter.Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  const createGround = () => {
    return Matter.Bodies.rectangle(600, 680, 1200, 40, {
      isStatic: true,
      render: { fillStyle: "#4B5563" },
    });
  };

  const addBox = () => {
    const box = Matter.Bodies.rectangle(
      Math.random() * 800 + 100,
      100,
      80,
      80,
      {
        render: { fillStyle: "#3B82F6" },
      }
    );

    Matter.Composite.add(engineRef.current.world, box);
  };

  const addCircle = () => {
    const circle = Matter.Bodies.circle(
      Math.random() * 800 + 100,
      100,
      40,
      {
        render: { fillStyle: "#10B981" },
      }
    );

    Matter.Composite.add(engineRef.current.world, circle);
  };

  const resetScene = () => {
    const world = engineRef.current.world;

    Matter.Composite.clear(world, false);

    Matter.Composite.add(world, [
      createGround(),
      mouseConstraintRef.current,
    ]);
  };

  return (
    <div
      style={{
        background: "#0F172A",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <h1 style={{ color: "white", textAlign: "center" }}>
        Virtual-Lab
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <button onClick={addBox}>Add Box</button>
        <button onClick={addCircle}>Add Circle</button>
        <button onClick={resetScene}>Reset</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div ref={sceneRef}></div>
      </div>
    </div>
  );
}

export default App;