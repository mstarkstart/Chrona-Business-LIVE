# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chrona-live.spec.ts >> 2. Dashboard & Real-time Widgets >> 2d. Most efficient & Most loaded panels render
- Location: tests\chrona-live.spec.ts:91:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Most efficient')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('text=Most efficient')

```

```yaml
- alert
- banner:
  - link "Chrona Business":
    - /url: /
  - link "Sign in":
    - /url: /login
  - link "Get started →":
    - /url: /signup
- main:
  - list:
    - listitem: 1 Business Company info
    - listitem: 2 Account Owner account
    - listitem: 3 Employees Add coworkers
    - listitem: 4 Calendar Internal calendar
    - listitem: 5 Complete Launch portal
  - heading "Tell us about your business" [level=1]
  - paragraph: We will use this to set up your primary workspace and customize your tracking dashboard.
  - text: Business Name
  - textbox "Business Name":
    - /placeholder: e.g. Acme Corporation
  - text: Founding Date
  - textbox "Founding Date"
  - text: Business Type
  - button "Self Employed One-person operation"
  - button "Partnership Shared ownership business"
  - button "Corporation Separate legal entity"
  - text: Industry
  - button "💻 Technology"
  - button "🏥 Healthcare"
  - button "🍽️ Restaurant"
  - button "🛒 Retail"
  - button "🚗 Automotive"
  - button "🏢 Other Business"
  - text: Services / Description
  - textbox "Services / Description":
    - /placeholder: Tell us briefly about what services you offer...
  - text: Estimated Employees 5
  - slider: "5"
  - text: 1 25 50+ Estimated Teams 2
  - slider: "2"
  - text: 1 7 15+
  - button "Back"
  - button "Continue"
```