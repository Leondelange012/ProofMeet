# ProofMeet V2.0 Design System

## 🎨 **Inspired by Online Intergroup AA**

ProofMeet's visual design is inspired by the [Online Intergroup Alcoholics Anonymous](https://aa-intergroup.org) website, creating a professional, trustworthy, and calming user experience for court-ordered meeting compliance tracking.

---

## 🌊 **Color Palette**

### Primary Colors
- **Navy Blue (Background):** `#0A2952`
  - Main background color
  - Creates a professional, calming atmosphere
  - High contrast with white text

- **Dark Navy (Cards):** `#0D3A6F`
  - Card backgrounds
  - Drawer/sidebar backgrounds
  - Elevated surfaces

### Accent Colors
- **Bright Cyan (Primary):** `#00D9FF`
  - Primary buttons
  - Links and interactive elements
  - Focus states
  - Logo accents

- **Light Cyan (Secondary):** `#4DD0E1`
  - Hover states
  - Gradient transitions
  - Chip labels
  - Progress bars

### Text Colors
- **White (Primary Text):** `#FFFFFF`
  - Main headings
  - Body text
  - High contrast for accessibility

- **Light Blue (Secondary Text):** `#B3E5FC`
  - Subheadings
  - Metadata
  - Less prominent information

### Status Colors
- **Success Green:** `#4CAF50` / `#81C784`
- **Warning Orange:** `#FF9800` / `#FFB74D`
- **Error Red:** `#F44336` / `#EF5350`

---

## 🎭 **Visual Elements**

### Gradients
```css
/* Primary Button Gradient */
background: linear-gradient(135deg, #00D9FF 0%, #4DD0E1 100%);

/* App Bar Gradient */
background: linear-gradient(135deg, #0A2952 0%, #0D3A6F 100%);

/* Drawer Gradient */
background: linear-gradient(180deg, #0A2952 0%, #0D3A6F 100%);

/* Progress Bar Gradient */
background: linear-gradient(90deg, #00D9FF 0%, #4DD0E1 100%);
```

### Shadows
- **Card Shadow:** `0 4px 20px rgba(0, 0, 0, 0.25)`
- **Card Hover Shadow:** `0 8px 30px rgba(0, 217, 255, 0.2)`
- **Button Hover Shadow:** `0 4px 12px rgba(0, 217, 255, 0.3)`

### Borders
- **Subtle Card Border:** `1px solid rgba(77, 208, 225, 0.15)`
- **Hover Card Border:** `rgba(77, 208, 225, 0.3)`
- **Input Border:** `rgba(77, 208, 225, 0.3)`
- **Focused Input Border:** `#00D9FF`

---

## 📐 **Typography**

### Font Family
- **Primary:** `'Inter'` (Google Fonts)
- **Fallback:** `'Roboto', 'Helvetica', 'Arial', sans-serif`

### Font Weights
- **Light:** 300
- **Regular:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700
- **Extrabold:** 800

### Headings
- **H1-H2:** Font weight 700, Tight letter spacing (-0.02em, -0.01em)
- **H3-H6:** Font weight 600
- **Buttons:** Font weight 600, No text transform

### Letter Spacing
- **H1:** `-0.02em`
- **H2:** `-0.01em`
- **Body:** Default

---

## 🧩 **Component Styles**

### Buttons
- **Border Radius:** `8px`
- **Padding:** `10px 24px`
- **Default Shadow:** None
- **Hover Shadow:** `0 4px 12px rgba(0, 217, 255, 0.3)`
- **Primary Style:** Cyan gradient with dark text

### Cards
- **Background:** `#0D3A6F` (dark navy)
- **Border:** `1px solid rgba(77, 208, 225, 0.15)`
- **Border Radius:** `12px`
- **Shadow:** `0 4px 20px rgba(0, 0, 0, 0.25)`
- **Hover Transformation:** Border glow + elevated shadow
- **Transition:** `all 0.3s ease`

### Chips
- **Border Radius:** Default
- **Font Weight:** 600
- **Primary Style:** Cyan gradient with dark text

### Text Fields
- **Border Color:** `rgba(77, 208, 225, 0.3)`
- **Hover Border:** `rgba(77, 208, 225, 0.5)`
- **Focus Border:** `#00D9FF`

### Progress Bars
- **Height:** `10px`
- **Background:** `rgba(255, 255, 255, 0.1)`
- **Border Radius:** `4px`
- **Fill:** Cyan gradient
- **Border:** `1px solid rgba(77, 208, 225, 0.2)`

### Scrollbar
- **Width:** `10px`
- **Track:** `rgba(10, 41, 82, 0.5)` with 5px border radius
- **Thumb:** Cyan gradient with 2px border
- **Hover Thumb:** Darker cyan gradient

---

## 🎯 **Status Indicators**

### Meeting Status Badges
```css
.meeting-status {
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid;
  backdrop-filter: blur(10px);
}

.meeting-status.active {
  background: rgba(76, 175, 80, 0.15);
  border-color: #4caf50;
  color: #81c784;
}

.meeting-status.completed {
  background: rgba(0, 217, 255, 0.15);
  border-color: #00D9FF;
  color: #4DD0E1;
}

.meeting-status.flagged {
  background: rgba(244, 67, 54, 0.15);
  border-color: #f44336;
  color: #ef5350;
}
```

### Compliance Bars
- **Good:** Green gradient (`#4caf50` → `#81c784`)
- **Warning:** Orange gradient (`#ff9800` → `#ffb74d`)
- **Danger:** Red gradient (`#f44336` → `#ef5350`)
- All with glowing box shadows

---

## 🌟 **Key Features**

1. **Dark Mode First:** Professional navy background with high contrast
2. **Gradient Accents:** Smooth cyan gradients for visual appeal
3. **Glassmorphism:** Subtle backdrop filters and transparency
4. **Smooth Transitions:** 0.3s ease transitions on interactive elements
5. **Hover Effects:** Elevated shadows and border glows
6. **Accessibility:** High contrast text, clear focus states
7. **Modern Typography:** Inter font with proper weights and spacing

---

## 📱 **Responsive Design**

### Breakpoints
- **Mobile:** `< 768px`
- **Tablet:** `768px - 1024px`
- **Desktop:** `> 1024px`

### Mobile Adjustments
- Smaller font sizes for badges
- Reduced padding on buttons
- Stacked layouts for cards
- Collapsible navigation

---

## 🚀 **Implementation**

All styles are implemented using:
- **Material-UI v5** with custom theme
- **CSS custom properties** for colors
- **Global CSS** for scrollbars and utilities
- **Component-level overrides** for MUI components

---

## 🎨 **Brand Identity**

ProofMeet's design communicates:
- **Trust:** Professional navy blue foundation
- **Hope:** Bright cyan accents
- **Clarity:** High contrast text and clean layouts
- **Support:** Warm, welcoming gradients
- **Authority:** Strong typography and clear hierarchy

---

## 📚 **References**

- **Inspiration:** [Online Intergroup AA](https://aa-intergroup.org)
- **Font:** [Inter on Google Fonts](https://fonts.google.com/specimen/Inter)
- **Icons:** Material Design Icons
- **Framework:** Material-UI (MUI)

---

**Last Updated:** October 11, 2025  
**Version:** 2.0.0  
**Status:** ✅ Complete & Deployed

