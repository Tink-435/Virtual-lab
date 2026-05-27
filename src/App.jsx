import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

function App() {
  const [gravity, setGravity] = useState(0.7);
  const [springStiffness, setSpringStiffness] = useState(0.005);
  const [density, setDensity] = useState(0.02);
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
  Constraint
} = Matter;
   

    const engine = Engine.create();
    engine.gravity.y = gravity;
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
  useEffect(() => {
  if (engineRef.current) {
    engineRef.current.gravity.y = gravity;
  }
  }, [gravity]);

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
        density,
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
        density,
        render: { fillStyle: "#10B981" },
      }
    );

    Matter.Composite.add(engineRef.current.world, circle);
  };
  const addSpringPair = () => {
  const box = Matter.Bodies.rectangle(650, 250, 80, 80, {
    density,
    render: {
      fillStyle: "#F59E0B",
    },
  });

  const spring = Matter.Constraint.create({
    pointA: { x: 450, y: 150 },
    bodyB: box,
    stiffness: springStiffness,
    damping: 0.05,
    length: 200,
    render: {
      strokeStyle: "#FFFFFF",
      lineWidth: 3,
    },
  });

  Matter.Composite.add(engineRef.current.world, [
    box,
    spring,
  ]);
};
const addCoupledSpring = () => {
  const boxA = Matter.Bodies.rectangle(450, 250, 80, 80, {
    density,
    render: {
      fillStyle: "#3B82F6",
    },
  });

  const boxB = Matter.Bodies.rectangle(750, 250, 80, 80, {
    density,
    render: {
      fillStyle: "#EF4444",
    },
  });

  const spring = Matter.Constraint.create({
    bodyA: boxA,
    bodyB: boxB,
    stiffness: springStiffness,
    damping: 0.05,
    length: 300,
    render: {
      strokeStyle: "#FFFFFF",
      lineWidth: 3,
    },
  });

  Matter.Composite.add(engineRef.current.world, [
    boxA,
    boxB,
    spring,
  ]);
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
    position: "absolute",
    left: "20px",
    top: "100px",
    width: "260px",
    background: "#1E293B",
    padding: "20px",
    borderRadius: "12px",
    color: "white",
    boxShadow: "0 8px 20px rgba(0,0,0,0.3)"
  }}
>
  <h3 style={{ marginBottom: "20px" }}>
    Physics Controls
  </h3>

  <div style={{ marginBottom: "20px" }}>
    <label>Gravity: {gravity.toFixed(1)}</label>
    <input
      type="range"
      min="0"
      max="2"
      step="0.1"
      value={gravity}
      onChange={(e) => setGravity(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  </div>

  <div style={{ marginBottom: "20px" }}>
    <label>
      Spring Stiffness: {springStiffness.toFixed(3)}
    </label>
    <input
      type="range"
      min="0.0001"
      max="0.5"
      step="0.0005"
      value={springStiffness}
      onChange={(e) =>
        setSpringStiffness(Number(e.target.value))
      }
      style={{ width: "100%" }}
    />
  </div>

  <div>
    <label>Density: {density.toFixed(3)}</label>
    <input
      type="range"
      min="0.001"
      max="0.2"
      step="0.001"
      value={density}
      onChange={(e) => setDensity(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  </div>
</div>

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
        <button onClick={addSpringPair}>Add Anchored Spring</button>
        <button onClick={addCoupledSpring}>
  Add Coupled Spring
</button>
        <button onClick={resetScene}>Reset</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div ref={sceneRef}></div>
      </div>
    </div>
  );
}

export default App;