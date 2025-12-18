import ForgotPassword from "./forgotPasswordView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Resetowanie hasła', 
}
export default function ForgotPasswordMainPage() {
  return <ForgotPassword />;
}