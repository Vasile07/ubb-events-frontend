import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { createQueryClient } from "./shared/lib/queryClient";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ToastProvider } from "./shared/ui/FeedbackComponents";
import "./styles/global.css";

const queryClient = createQueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </QueryClientProvider>,
);
