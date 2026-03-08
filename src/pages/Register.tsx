import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const Register = () => {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState("+880");
  const [phone, setPhone] = useState("");

  return (
    <div className="min-h-screen bg-background px-6 py-4">
      <button onClick={() => navigate(-1)} className="mb-12 text-foreground">
        <ArrowLeft size={24} />
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-10 text-3xl font-bold text-foreground">
          Enter Phone number.
        </h1>

        <div className="mb-10 flex items-center gap-3 border-b border-border pb-3">
          <button className="flex items-center gap-1 text-primary">
            <span className="text-lg font-medium">{countryCode}</span>
            <ChevronDown size={16} />
          </button>
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <button
          onClick={() => navigate("/feed")}
          className="w-full rounded-xl bg-primary/70 py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary active:scale-[0.98]"
        >
          Submit
        </button>
      </motion.div>
    </div>
  );
};

export default Register;
