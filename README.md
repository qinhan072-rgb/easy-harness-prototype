# Easy Harness Platform Prototype

Interactive front-end platform prototype for the early Easy Harness request flow.
The prototype is now request-driven: the user app and ops console read and update
the same request thread instead of jumping between separate display screens.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Demo Flow

1. Start on the upload-first request screen.
2. Upload files or click **Use sample request**.
3. Click the black arrow button to submit.
4. Watch the animated checklist transition.
5. Enter the request thread after check and draft generation.
6. Add more user details from the bottom composer.
7. Open **Requests** from the left navigation to see saved request records.
8. Open the ops console in the same tab:

```text
http://127.0.0.1:5173/#staff
```

9. Pick a request from the queue.
10. Reply in the same thread as Easy Harness.
11. Optionally include a table preview, layout preview, attachment name, and/or harness price.
12. Send the update. If a price is included, both sides get a lightweight price record in the thread.
13. Return to the user app and confirm the draft once the request is ready.

If an update is sent without a price, the request remains **In review**. Once a
price exists, the request becomes **Ready to confirm** and does not bounce back
to earlier states during later discussion.

## Product Assumptions

- The first launch version includes a real checking agent.
- The checking step only decides whether the request can enter review.
- Draft creation and final pricing can improve over time without changing the user flow.
- The user-facing flow should look like an AI request workspace, not an old ticket system.
- User and ops views share the same request data and message history.
- Shipping, taxes, and merchant payment are intentionally out of scope for this prototype.
