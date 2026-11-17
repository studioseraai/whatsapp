import type { Metadata } from "next";
export const metadata: Metadata={title:"Studio Seraai | Art Concierge"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body style={{margin:0,background:"#f7f3ed",fontFamily:"Georgia,serif"}}>{children}</body></html>}