import { DebateInterface } from "../components/debate-interface"
import Head from "next/head"

export default function DebatePage() {
  return (
    <>
      <Head>
        <title>Historical Debates</title>
        <meta name="description" content="Engage with historical figures in fascinating debates" />
      </Head>
      
      <DebateInterface />
    </>
  )
}