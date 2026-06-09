# VIRTUAL-LAB

A real-time collaborative virtual physics laboratory designed for STEM education.

Virtual-Lab enables instructors and students to create, share, simulate, analyse, and assess physics experiments within a shared online environment. Users can build interactive physics simulations, collaborate in real time, visualise physical phenomena through live analytics, and complete structured laboratory assignments directly in the browser.

Beyond simulation, the platform provides a complete educational workflow where instructors can publish experiments as reusable templates, assign laboratory activities, collect student submissions, and provide grades and feedback.

Think of it as **Google Docs meets a Physics Laboratory**.

---

## Demo

📹 **Demo Video:** *https://drive.google.com/file/d/15TXW0q3eV_26PRUhBXsbXdNX2pCj5Qqu/view?usp=share_link*

📄 **Project Report / Documentation:** *https://drive.google.com/file/d/17eKcZ_1N_N3B7D9j3CZI47LypLzBULze/view?usp=share_link*

---

## Screenshots

### Login & Registration

![Login Page](./screenshots/login.png)

### Instructor Dashboard

![Instructor Dashboard](./screenshots/dashboard.png)

### Physics Canvas

![Physics Canvas](./screenshots/canvas.png)

### Analytics Dashboard

![Analytics Dashboard](./screenshots/analytics.png)

---

## The Problem

Physics is fundamentally an experimental science, yet online learning environments often reduce it to static diagrams, recorded lectures, and textbook equations.

While students may understand formulas theoretically, developing intuition for concepts such as conservation of energy, harmonic motion, collisions, oscillations, and momentum transfer requires experimentation and observation.

Traditional laboratory access is limited by equipment costs, scheduling constraints, and physical availability. As a result, students often miss opportunities to actively explore physical systems and observe how changing parameters affects real-world behaviour.

Virtual-Lab bridges this gap by providing a browser-based collaborative physics environment where instructors and students can build experiments together, analyse live simulation data, conduct guided laboratory activities, and complete assessments entirely online.

---

## Key Features

### Real-Time Collaborative Physics Simulation

* Multi-user shared physics workspace
* Live synchronization powered by Socket.io
* Instructor-led demonstrations and collaborative experimentation
* Real-time cursor and interaction updates
* Room-based collaboration using simple join codes

### Interactive Physics Sandbox

* Create and manipulate:

  * Boxes
  * Circles
  * Triangles
  * Hexagons
* Drag-and-drop experiment construction
* Real-time collision handling
* Adjustable gravity and simulation controls
* Constraint-based experiment creation

### Built-In Experiment Presets

* Free Fall
* Simple Harmonic Motion (SHM)
* Pendulum
* Coupled Springs
* Collision Experiments

These presets allow users to immediately explore common physics concepts without building experiments from scratch.

### Advanced Classroom Controls

Instructor-only classroom management features:

* Lock / unlock collaborative editing
* Freeze all bodies
* Flip gravity
* Enable zero gravity
* Trigger shockwave events
* Pin bodies in place
* Control simulation state for all participants simultaneously

### Live Analytics & Visualization

* Kinetic Energy tracking
* Potential Energy tracking
* Total Energy monitoring
* Velocity visualization
* Acceleration visualization
* Motion analytics dashboard
* Real-time graph generation using Recharts

Students can visually observe physical laws such as conservation of energy as simulations evolve.

### Experiment Persistence & Versioning

* Save experiments to a personal library
* Reopen previous experiments
* Maintain version history
* Continue experiments across sessions
* Store reusable physics scenarios

### Experiment Publishing System

Instructors can:

* Publish experiments as templates
* Attach laboratory instructions
* Define grading rubrics
* Share experiments with students
* Build reusable learning activities

### Assignment & Assessment Workflow

Students can:

* Access published templates
* Complete assigned experiments
* Submit finished work directly through the platform

Instructors can:

* Review submissions
* Inspect experiment states
* Assign grades
* Provide personalised feedback

This transforms Virtual-Lab from a simple simulator into a complete digital laboratory environment.

---

## Educational Workflow

### Instructor Workflow

1. Create or configure a physics experiment
2. Save it to the experiment library
3. Publish it as a reusable template
4. Add instructions and grading criteria
5. Share the activity with students
6. Monitor submissions
7. Grade completed work and provide feedback

### Student Workflow

1. Join a collaborative room
2. Explore instructor-created experiments
3. Modify and analyse the simulation
4. Observe live analytics
5. Submit completed work
6. Review grades and feedback

### Assessment Workflow

1. Instructor publishes a laboratory activity
2. Students complete the experiment
3. Submissions are stored alongside the original template
4. Instructor reviews experiment outcomes
5. Grades and feedback are assigned
6. Students receive evaluation results directly within the platform

---

## Features by Role

### Students

* Join rooms using a 6-character room code
* Collaborate in real time
* Build and modify experiments
* Track energy and motion analytics
* Save experiments to a personal library
* Access instructor-published templates
* Submit completed assignments
* Receive grades and feedback

### Instructors

* Create collaborative rooms
* Share room codes
* Demonstrate live physics experiments
* Lock classroom interactions
* Trigger classroom-wide simulation events
* Publish experiment templates
* Create laboratory activities
* Review student submissions
* Grade and provide feedback

### Administrators

* Manage platform users
* Monitor system usage
* Maintain role-based access control

---

## Deliverables Completed

| Deliverable                          | Status |
| ------------------------------------ | ------ |
| Interactive Physics Canvas           | ✅      |
| Real-Time Multi-User Collaboration   | ✅      |
| Matter.js Physics Engine Integration | ✅      |
| Experiment Presets                   | ✅      |
| Live Analytics Dashboard             | ✅      |
| Energy Conservation Visualization    | ✅      |
| Experiment Library                   | ✅      |
| Experiment Versioning                | ✅      |
| Template Publishing Workflow         | ✅      |
| Assignment Submission System         | ✅      |
| Instructor Grading & Feedback        | ✅      |
| JWT Authentication & RBAC            | ✅      |
| Dockerized Deployment                | ✅      |
| GitHub Actions CI/CD Pipeline        | ✅      |

---

## Future Work

* Full constraint persistence for advanced experiments
* Session replay and experiment playback
* LMS integration (Canvas, Moodle, Google Classroom)
* AI-assisted experiment guidance
* Automated grading recommendations
* Collaborative whiteboard annotations
* Mobile and tablet support
* Expanded physics preset library

---

Built with ❤️ using React, Matter.js, Socket.io, Node.js, MongoDB, Docker, and modern web technologies.
