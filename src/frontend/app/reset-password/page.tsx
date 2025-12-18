import ResetPassword from "./resetPasswordView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Resetowanie hasła', 
}
export default function ResetPasswordMainPage() {
  return <ResetPassword />;
}