# AI Live Virtual Try-On

A Windows-friendly, Docker-free **real-time AI virtual try-on prototype** built around Decart's realtime **Lucy VTON 3.5** model.

The application uses a browser webcam as the live input, sends the camera stream to Decart through WebRTC, applies a selected garment, and receives an AI-transformed video stream back in real time.

The current project is the foundation for a future **embeddable ecommerce virtual try-on widget** where customers can try garments directly from a product page.

---

## Current Status

The project currently has a **working realtime AI virtual try-on prototype**.

### Current completion status

**Approximately 60% complete.**

### Implemented

- Real-time webcam input
- Browser camera access
- Garment image upload
- Automatic camera startup after garment selection
- Decart realtime connection
- WebRTC-based video streaming
- Lucy VTON 3.5 integration
- AI-transformed video output
- Original webcam picture-in-picture
- Garment replacement
- Same realtime session garment switching
- FastAPI backend
- Temporary Decart client tokens
- Server-side permanent Decart API key
- Windows development setup
- Docker-free setup
- GPU-free local development
- Live connection/status indicators
- Garment preview
- Stop/disconnect functionality

### Remaining development

- Improve transformation stability
- Improve output quality
- Improve standing/sitting transitions
- Improve movement handling
- Improve garment fitting
- Improve reconnect handling
- Optimize provider/API usage
- Build reusable VTO components
- Create embeddable widget
- Product-page integration
- Multi-client support
- Production deployment

---

## Project Overview

The current workflow is:

```text
User
 │
 ├── Webcam
 │
 └── Garment Image
        │
        ▼
 React Frontend
        │
        │ Temporary client token
        ▼
 FastAPI Backend
        │
        ▼
 Decart Realtime Service
        │
        │ WebRTC / LiveKit
        ▼
 Lucy VTON 3.5
        │
        │ AI transformed video
        ▼
 React Frontend
        │
        ▼
 User sees live virtual try-on
```

The permanent Decart API key stays on the backend.

The browser receives only a short-lived client token.

---

# Key Features

## 1. Live Camera

The browser requests webcam access using the browser MediaDevices API.

The camera stream becomes the input to the realtime VTO pipeline.

## 2. Garment Upload

The user can select a garment image from the computer.

Example:

```text
green-shirt.jpg
```

The garment is previewed in the UI and then sent to the active realtime VTO session.

The application does not require the user to upload a photo of themselves.

The user's live webcam is used as the person input.

## 3. Realtime AI Virtual Try-On

After the realtime connection is established:

```text
Webcam
   ↓
Decart Realtime
   ↓
Lucy VTON 3.5
   ↓
AI Video
   ↓
Browser
```

The main video area displays the transformed output.

## 4. Original Camera Picture-in-Picture

During AI VTO mode, the original webcam feed remains visible as a small PiP preview.

```text
┌─────────────────────────────────────┐
│                                     │
│        AI TRANSFORMED VIDEO         │
│                                     │
│                                     │
│                       ┌──────────┐  │
│                       │ Original │  │
│                       │ Camera   │  │
│                       └──────────┘  │
│                                     │
└─────────────────────────────────────┘
```

This provides a video-call-style experience.

## 5. Garment Switching

The user can change the garment while the realtime session is active.

Conceptually:

```text
Shirt A
   ↓
Live VTO
   ↓
Shirt B
   ↓
Live VTO
```

The application attempts to reuse the existing realtime session instead of unnecessarily reconnecting.

## 6. Stop and Cleanup

Stopping the VTO session:

```text
Stop
 ↓
Disconnect realtime session
 ↓
Stop webcam tracks
 ↓
Clear AI video
 ↓
Return to idle state
```

---

# Current Model

The current default model is:

```text
lucy-vton-3.5
```

The project uses:

```text
@decartai/sdk
```

for the realtime connection.

The realtime transport uses WebRTC/LiveKit internally.

There is currently **no local VTO inference model** running on the office laptop.

---

# Why Decart Is Used

The current prototype uses Decart because the application requires a realtime virtual try-on pipeline.

The local machine does not need to run the VTO model.

Instead:

```text
Office Laptop
     │
     │ Camera stream
     ▼
Decart Realtime
     │
     │ AI inference
     ▼
AI transformed stream
     │
     ▼
Office Laptop
```

This makes the prototype practical on a normal Windows machine without a dedicated local GPU for the VTO inference.

---

# Technology Stack

## Frontend

```text
React              19.1.1
React DOM          19.1.1
TypeScript         5.9.2
Vite               7.1.7
@decartai/sdk      0.2.3
livekit-client     2.20.2
```

Frontend responsibilities:

- Camera access
- Garment selection
- VTO UI
- Decart client connection
- WebRTC stream handling
- AI video rendering
- PiP camera rendering
- Garment switching
- Connection state management

## Backend

```text
Python
FastAPI
Uvicorn
Decart API
```

Backend responsibilities:

- Protect permanent Decart API key
- Generate short-lived client tokens
- Provide health endpoint
- Configure model/service settings
- Handle frontend-to-provider authentication flow

---

# Requirements

## Hardware

- Windows 10 or Windows 11
- Working webcam
- Internet connection

A dedicated GPU is **not required for the current VTO inference architecture** because inference is performed through the remote realtime service.

## Software

- Node.js 18+
- Python 3.10+
- npm
- Modern browser
- Decart account
- Decart API key

---

# Project Structure

```text
ai-live-virtual-try-on/
│
├── backend/
│   │
│   ├── app/
│   │   └── main.py
│   │
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   │
│   ├── public/
│   │   └── garments/
│   │
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   └── vite-env.d.ts
│   │
│   ├── package.json
│   └── vite.config.js
│
├── scripts/
│   ├── run-backend-windows.bat
│   └── run-frontend-windows.bat
│
└── README.md
```

---

# Backend Setup

Open PowerShell in the project root.

```powershell
cd backend
```

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

Upgrade pip:

```powershell
python -m pip install --upgrade pip
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

---

# Backend Environment Variables

Create:

```text
backend/.env
```

Example:

```env
DECART_API_KEY=YOUR_DECART_API_KEY
DECART_MODEL=lucy-vton-3.5
DECART_TOKEN_TTL_SECONDS=600
DECART_SERVICE_TIER=0
FRONTEND_ORIGIN=http://localhost:5173
```

Replace:

```text
YOUR_DECART_API_KEY
```

with the actual Decart API key.

---

# Security

The permanent Decart API key must **never** be placed inside the frontend.

Do not put it in:

```text
frontend/.env
```

Do not put it in:

```text
App.tsx
```

Do not expose it in browser-accessible JavaScript.

The intended architecture is:

```text
Browser
   │
   │ Request temporary token
   ▼
FastAPI
   │
   │ Permanent API key
   ▼
Decart
   │
   │ Short-lived client token
   ▼
Browser
```

---

# Start Backend

From:

```text
backend/
```

run:

```powershell
uvicorn app.main:app --reload --port 8000
```

The backend should be available at:

```text
http://localhost:8000
```

---

# Health Check

Open:

```text
http://localhost:8000/health
```

A healthy configuration should return a response similar to:

```json
{
  "ok": true,
  "service": "ai-live-virtual-try-on",
  "provider": "decart",
  "model": "lucy-vton-3.5",
  "api_key_configured": true
}
```

---

# Frontend Setup

Open a second PowerShell window.

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start Vite:

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# Windows Helper Scripts

Backend:

```powershell
scripts\run-backend-windows.bat
```

Frontend:

```powershell
scripts\run-frontend-windows.bat
```

The project does not require Docker.

---

# Garment Images

Sample garments can be placed inside:

```text
frontend/public/garments/
```

Example:

```text
frontend/public/garments/
├── black-shirt.jpg
├── white-shirt.jpg
├── green-shirt.jpg
└── jacket.jpg
```

For better virtual try-on results, use clean garment references.

Recommended characteristics:

- Garment clearly visible
- Prefer garment-only images
- Minimal background
- Good lighting
- Good resolution
- Front-facing garment when possible
- No person wearing the garment
- Avoid heavily cropped garments

A clean product image is generally more useful than a photograph showing another person wearing the garment.

---

# Current Realtime Flow

The current application follows this sequence:

```text
1. User selects garment
          ↓
2. Browser starts webcam
          ↓
3. Frontend requests temporary Decart token
          ↓
4. FastAPI creates token
          ↓
5. Frontend creates Decart client
          ↓
6. Realtime session connects
          ↓
7. Camera stream is sent over WebRTC
          ↓
8. Garment reference is applied
          ↓
9. Decart returns transformed stream
          ↓
10. Browser displays AI video
```

---

# WebRTC / LiveKit

The Decart realtime SDK uses a LiveKit-based realtime transport.

The current dependency relationship is:

```text
@decartai/sdk@0.2.3
└── livekit-client@2.20.2
```

The browser receives a remote media stream from the realtime session and attaches it to the AI video element.

---

# Frame Metadata Worker

The realtime video pipeline uses a frame-metadata worker.

During Vite development, a source-map warning may appear for:

```text
livekit-client.fm.worker.js.map
```

For example:

```text
Failed to load source map for ...
livekit-client.fm.worker.js
```

This warning relates to a missing source-map file.

If the actual worker request succeeds and the realtime AI video works, the missing source map is not itself the runtime VTO failure.

The important thing to verify is whether:

```text
frame-metadata-worker.js
```

loads successfully.

---

# Browser Console Debugging

Useful logs include:

```text
[DecartSDK] realtime connect: starting
```

Then:

```text
connection state changed: disconnected -> connecting
```

Then:

```text
signal connected
```

Then:

```text
connection state changed: connecting -> connected
```

Then:

```text
[Decart] Remote stream received
```

Then:

```text
[Decart] AI metadata loaded
```

And finally:

```text
[Decart] AI video playing
```

This sequence indicates that the browser has successfully received and started playing the remote AI video stream.

---

# Troubleshooting

## Backend returns 503 on `/api/decart/token`

Check:

- `backend/.env` exists
- `DECART_API_KEY` is configured
- The key is valid
- Backend was restarted after modifying `.env`
- Internet access is available
- Decart service is reachable

---

## Camera Works but AI Video Is Black

Check:

1. Browser console
2. Network tab
3. WebRTC connection
4. Remote stream
5. AI video element
6. Video tracks

Expected console sequence:

```text
Remote stream received
AI metadata loaded
AI video playing
```

If the remote stream is received but the video element reports:

```text
videoWidth: 0
videoHeight: 0
```

investigate the remote media track and browser playback state.

---

## AI Video Works for a Few Seconds and Stops

Check the console for provider errors.

For example:

```text
Insufficient credits
```

If the provider rejects the realtime session because the account has insufficient credits, the browser may subsequently report a secondary connection error such as:

```text
Stale connect attempt
```

The provider's original error should be treated as the primary issue.

---

# Insufficient Credits

Provider-side usage, quotas, account limits, and free-tier availability are controlled by the Decart platform.

The application cannot bypass provider-side usage restrictions.

For development, use an available account/tier according to the provider's terms.

For production, use an appropriate commercial/API arrangement.

---

# Garment Quality Problems

If the garment does not appear correctly, use a cleaner garment image.

Prefer:

```text
Garment-only
     +
Clear edges
     +
Good lighting
     +
Simple background
```

Avoid:

```text
Person wearing garment
     +
Busy background
     +
Low resolution
     +
Severely cropped garment
```

The prompt can also be adjusted according to the garment type, material, fit, sleeves, collar, folds, shadows, and occlusion.

---

# Movement Stability

Realtime VTO quality can change when the person:

- Moves quickly
- Turns significantly
- Leaves the camera frame
- Changes distance from the camera
- Sits down
- Stands up
- Rotates the body
- Covers the garment area
- Has poor lighting

Movement stability is therefore one of the major areas planned for improvement.

---

# Current Limitations

The current implementation is a prototype and not yet a complete commercial VTO platform.

Known improvement areas:

- Better pose/movement stability
- Better standing/sitting transitions
- Better garment boundaries
- Better garment fit
- Better handling of occlusion
- Better output consistency
- Better low-light handling
- Better reconnect logic
- Better provider failure handling
- Better usage/cost management
- Production authentication
- Multi-tenant architecture
- Ecommerce integration
- Embeddable widget
- Production deployment

---

# Planned Product: Embeddable VTO Widget

The long-term goal is to convert the current application into an **embeddable AI virtual try-on widget for ecommerce websites**.

The target experience is:

```text
                  ECOMMERCE WEBSITE
                         │
       ┌─────────────────┴─────────────────┐
       │                                   │
   Product Page                       Floating VTO
       │                                   │
   "TRY IT ON"                             │
       │                                   │
       └─────────────────┬─────────────────┘
                         │
                         ▼
                  VTO WIDGET
                         │
              ┌──────────┴──────────┐
              │                     │
           Popup               Fullscreen
              │
              ▼
        Live AI Try-On
```

---

# Floating Widget

A client website could have a floating button:

```text
┌──────────────────────────────────────────────┐
│                                              │
│              CLIENT WEBSITE                  │
│                                              │
│                                              │
│                                      ┌─────┐ │
│                                      │ TRY │ │
│                                      │ ON  │ │
│                                      └─────┘ │
└──────────────────────────────────────────────┘
```

Clicking it opens the VTO popup.

---

# Popup Mode

Normal mode:

```text
┌───────────────────────────────┐
│ AI TRY-ON                X    │
│                               │
│       AI VIDEO                │
│                               │
│                     ┌───────┐ │
│                     │ CAMERA│ │
│                     └───────┘ │
│                               │
│ Current Garment               │
│ Green Shirt                   │
│                               │
│ [ Change Garment ]            │
│ [ Upload Garment ]            │
└───────────────────────────────┘
```

The widget can be expanded into fullscreen mode when required.

---

# Product-Aware Try-On

One of the most important planned features is **automatic product garment selection**.

The user should not have to upload the garment every time.

Example ecommerce product:

```text
Green Shirt
₹1,299

[ TRY IT ON ]
```

The product page already knows the garment image.

When the user clicks:

```text
TRY IT ON
```

the website can pass the product image to the VTO widget.

Conceptually:

```javascript
VTO.open({
  productId: "12345",
  garmentUrl: "https://example.com/images/green-shirt.jpg"
});
```

The widget then:

```text
Product
   ↓
Garment image
   ↓
VTO session
   ↓
Live AI
   ↓
User wearing selected product
```

No manual garment upload is required.

---

# Upload Your Own Garment

The widget should still support manual uploads.

Example:

```text
Current Product
      ↓
Live Try-On

[ Upload Your Own Garment ]
```

The user can replace the ecommerce product with their own garment image.

This gives the widget two garment sources:

```text
1. Ecommerce product image
2. User-uploaded garment image
```

---

# Garment Switching

The planned widget should support:

```text
Shirt A
   ↓
Shirt B
   ↓
Jacket A
   ↓
Hoodie A
```

without unnecessarily creating a new realtime session every time.

The existing prototype already has the foundation for active-session garment updates.

---

# Planned Embeddable Integration

A future client integration could look like:

```html
<script src="https://your-vto-domain.com/vto.js"></script>

<script>
  VTO.mount({
    position: "bottom-right"
  });
</script>
```

The client can then open a garment:

```javascript
VTO.open({
  productId: "12345",
  garmentUrl: "https://example.com/images/shirt.jpg"
});
```

The client website does not need to directly manage:

- Decart API keys
- WebRTC
- LiveKit
- VTO inference
- Realtime session management

Those responsibilities remain inside the VTO platform.

---

# Planned Widget API

Potential API:

```javascript
VTO.mount({
  position: "bottom-right"
});
```

Open:

```javascript
VTO.open();
```

Open with product:

```javascript
VTO.open({
  productId: "12345",
  garmentUrl: "https://example.com/shirt.jpg"
});
```

Close:

```javascript
VTO.close();
```

Fullscreen:

```javascript
VTO.fullscreen();
```

Change garment:

```javascript
VTO.setGarment({
  garmentUrl: "https://example.com/jacket.jpg"
});
```

These APIs represent the planned product architecture and are not necessarily implemented in the current prototype.

---

# Planned Product Architecture

The production architecture is intended to look like:

```text
CLIENT WEBSITE
      │
      ▼
EMBEDDABLE VTO WIDGET
      │
      ▼
OUR VTO BACKEND
      │
      ▼
VTO PROVIDER LAYER
      │
      ├── Decart
      │
      ├── Future Provider
      │
      └── Future Self-Hosted Model
```

This separation is important because the client website should integrate with **our VTO platform**, rather than being tightly coupled to a specific AI provider.

---

# Provider Abstraction

Current:

```text
Frontend
   ↓
Our Backend
   ↓
Decart
```

Future:

```text
Frontend
   ↓
Our Backend
   ↓
Provider Abstraction
   ├── Decart
   ├── Other Provider
   └── Self-Hosted Model
```

This makes it possible to change the underlying inference provider later without requiring every client website to change its integration.

---

# Native Mobile App Integration

The planned JavaScript widget is primarily intended for ecommerce websites.

A native Android/iOS application is different.

For a native mobile app, integration could eventually use:

```text
Native App
    ↓
WebView / Native SDK
    ↓
VTO Platform
    ↓
Realtime AI
```

A normal JavaScript embed cannot automatically be injected into an unrelated native application.

The mobile SDK/integration can therefore be treated as a separate future development stage.

---

# Production Security

Before commercial deployment, the following should be implemented.

### API Security

- Server-side provider credentials
- Short-lived client tokens
- Authentication
- Rate limiting
- Session validation
- Origin/domain restrictions

### Multi-Tenant Security

Each client should have isolated:

```text
Client
Product
Garments
Sessions
Usage
Allowed Domains
Configuration
```

---

# Production Cost Management

Realtime AI video can consume significant provider resources.

The production architecture should therefore optimize:

- Session reuse
- Garment switching
- Connection lifetime
- Unnecessary reconnects
- Token lifetime
- Usage monitoring
- Client-level quotas
- Provider billing controls

The application should never attempt to bypass provider-side usage limits.

---

# Future Self-Hosted Model

The current project does not run its own VTO model.

A future architecture could replace the external provider:

```text
Browser
   ↓
Our Backend
   ↓
Our VTO Inference Server
   ↓
GPU
   ↓
Our Own VTO Model
```

This would provide greater control over:

- Model
- Inference
- API
- Pricing
- Usage
- Client management
- Data flow

However, realtime self-hosted VTO would require suitable GPU infrastructure and an inference pipeline capable of meeting realtime latency requirements.

---

# Development Roadmap

```text
60%   Core realtime VTO                         ✅
      │
70%   Movement / output stability
      │
75%   Garment quality improvements
      │
80%   Session and cost optimization
      │
85%   Reusable VTO components
      │
90%   Backend provider abstraction
      │
95%   Embeddable ecommerce widget
      │
100%  Production-ready VTO platform
```

---

# Development Priorities

## Phase 1 — Improve Current VTO

- Improve AI output stability
- Improve movement handling
- Improve garment fitting
- Improve standing/sitting behavior
- Improve reconnect handling
- Improve error states

## Phase 2 — Refactor

Move the VTO functionality from the current application screen into reusable components:

```text
VTOWidget
VTOPlayer
CameraView
GarmentUploader
GarmentSelector
VTOControls
```

## Phase 3 — Embeddable Widget

Build:

```text
vto.js
```

and:

```text
VTOWidget
```

with popup/fullscreen behavior.

## Phase 4 — Ecommerce Integration

Support:

```text
Product Page
     ↓
Try It On
     ↓
Garment URL
     ↓
VTO Widget
```

## Phase 5 — Platform

Add:

```text
Client Management
Product Management
Usage Analytics
API Keys
Domain Restrictions
Usage Limits
Provider Management
```

---

# Example Final Ecommerce Experience

The intended final experience is:

```text
                 FASHION WEBSITE

        ┌───────────────────────────┐
        │                           │
        │       PRODUCT IMAGE       │
        │                           │
        │       Green Shirt         │
        │       ₹1,299              │
        │                           │
        │       [ TRY IT ON ]       │
        │                           │
        └───────────────────────────┘

                       ↓

                VTO POPUP OPENS

        ┌───────────────────────────┐
        │ AI TRY-ON            X    │
        │                           │
        │       LIVE AI VIDEO       │
        │                           │
        │                   ┌─────┐ │
        │                   │ CAM │ │
        │                   └─────┘ │
        │                           │
        │ Green Shirt               │
        │                           │
        │ [ Change Garment ]        │
        │ [ Upload Garment ]        │
        └───────────────────────────┘

                       ↓

             USER WEARS THE PRODUCT
                IN LIVE AI VIDEO
```

The user can then click another garment/product and update the try-on experience.

---

# Important Current Scope

This repository currently represents the **realtime VTO prototype**, not the final ecommerce widget platform.

The following are planned rather than guaranteed to be implemented in the current version:

- Embeddable JavaScript SDK
- Floating widget
- Popup mode
- Fullscreen mode
- Automatic product-page integration
- Product catalog integration
- Multi-client platform
- Native mobile SDK
- Self-hosted VTO model

The current prototype is the foundation for these features.

---

# Troubleshooting Checklist

Before debugging the AI model, verify:

```text
[ ] Backend is running
[ ] /health returns OK
[ ] Decart API key is configured
[ ] Frontend is running
[ ] Camera permission is allowed
[ ] Camera stream is visible
[ ] Temporary token request succeeds
[ ] Realtime connection reaches connected state
[ ] Remote stream is received
[ ] Remote video track exists
[ ] AI video metadata loads
[ ] AI video starts playing
[ ] Account has sufficient provider usage/credits
```

---

# Useful Development Commands

## Backend

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Force Vite optimization

```powershell
npm run dev -- --force
```

## Dependency inspection

```powershell
npm ls @decartai/sdk livekit-client
```

Expected dependency relationship:

```text
@decartai/sdk@0.2.3
└── livekit-client@2.20.2
```

---

# Environment Summary

```text
OS              Windows
Frontend        React + TypeScript + Vite
Backend         FastAPI + Python
AI Provider     Decart
Model           Lucy VTON 3.5
Transport       WebRTC / LiveKit
Local GPU       Not required
Docker          Not required
Camera          Browser webcam
Authentication  Temporary client token
```

---

# Security Reminder

Never commit:

```text
backend/.env
```

to Git if it contains the real API key.

Use:

```text
backend/.env.example
```

for safe configuration documentation.

A real API key should never appear in:

```text
GitHub
README.md
App.tsx
Browser source
Browser console
Frontend environment variables
```

---

# Official References

- Decart Realtime Try-On Examples  
  https://github.com/DecartAI/tryon-examples

- Decart JavaScript SDK  
  https://github.com/DecartAI/sdk

- Decart Python SDK  
  https://github.com/DecartAI/decart-python

- Decart Platform  
  https://platform.decart.ai/

---

# License / Commercial Usage

This prototype depends on Decart's hosted realtime VTO service.

Before commercial deployment, review the applicable provider pricing, API limits, quotas, service terms, and commercial/enterprise requirements.

The project architecture is intentionally designed so that the client-facing VTO integration can eventually remain independent of the underlying inference provider.
