import MusicRow from "../../components/layout/MusicRow";

export default function MadeForYou() {
  return (
    <div style={{ padding: "24px 20px", color: "#fff" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "28px" }}>
        Made For You
      </h1>

      <MusicRow title="Recommended For You" query="trending hindi songs" />
      <MusicRow title="Based on Your Taste" query="bollywood hits" />
      <MusicRow title="Discover Weekly" query="new hindi songs" />
    </div>
  );
}