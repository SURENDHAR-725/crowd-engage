import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ThumbsUp, ThumbsDown, Star } from "lucide-react";

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

interface LivePollProps {
  type: 'mcq' | 'yesno' | 'rating';
  question: string;
  options: PollOption[];
  hasResponded: boolean;
  selectedOption: string | null;
  onVote: (optionId: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  totalVotes: number;
  showLiveResults?: boolean;
}

export const LivePoll = ({
  type,
  question,
  options,
  hasResponded,
  selectedOption,
  onVote,
  onSubmit,
  submitting = false,
  totalVotes,
  showLiveResults = false,
}: LivePollProps) => {
  const maxVotes = Math.max(...options.map(o => o.votes), 1);

  // Yes/No Poll
  if (type === 'yesno') {
    return (
      <div className="space-y-6">
        <Card variant="elevated" className="mb-6">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl md:text-3xl font-display font-bold">{question}</h1>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {!hasResponded ? (
            <motion.div
              key="voting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onVote(options[0]?.id || 'yes')}
                disabled={submitting}
                className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                  selectedOption === (options[0]?.id || 'yes')
                    ? "border-spark-green bg-spark-green/10"
                    : "border-border hover:border-spark-green/50"
                }`}
              >
                <ThumbsUp className={`w-12 h-12 ${selectedOption === (options[0]?.id || 'yes') ? 'text-spark-green' : 'text-muted-foreground'}`} />
                <span className="text-xl font-bold">Yes</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onVote(options[1]?.id || 'no')}
                disabled={submitting}
                className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                  selectedOption === (options[1]?.id || 'no')
                    ? "border-spark-coral bg-spark-coral/10"
                    : "border-border hover:border-spark-coral/50"
                }`}
              >
                <ThumbsDown className={`w-12 h-12 ${selectedOption === (options[1]?.id || 'no') ? 'text-spark-coral' : 'text-muted-foreground'}`} />
                <span className="text-xl font-bold">No</span>
              </motion.button>

              <Button
                variant="gradient"
                size="xl"
                className="col-span-2 mt-4"
                disabled={!selectedOption || submitting}
                onClick={onSubmit}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </motion.div>
          ) : (
            <YesNoResults options={options} selectedOption={selectedOption} totalVotes={totalVotes} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Rating Poll (1-5 stars or 1-10 scale)
  if (type === 'rating') {
    const ratingOptions = options.length > 0 ? options : Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      text: String(i + 1),
      votes: 0,
      percentage: 0,
    }));

    return (
      <div className="space-y-6">
        <Card variant="elevated" className="mb-6">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl md:text-3xl font-display font-bold">{question}</h1>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {!hasResponded ? (
            <motion.div
              key="voting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-center gap-2">
                {ratingOptions.map((option, index) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onVote(option.id)}
                    disabled={submitting}
                    className="p-2 transition-all"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        selectedOption && parseInt(selectedOption) >= parseInt(option.id)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
              <p className="text-center text-muted-foreground">
                {selectedOption ? `You selected ${selectedOption} star${parseInt(selectedOption) > 1 ? 's' : ''}` : 'Tap a star to rate'}
              </p>
              <Button
                variant="gradient"
                size="xl"
                className="w-full"
                disabled={!selectedOption || submitting}
                onClick={onSubmit}
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </motion.div>
          ) : (
            <RatingResults options={ratingOptions} selectedOption={selectedOption} totalVotes={totalVotes} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Standard MCQ Poll
  return (
    <div className="space-y-6">
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-8 text-center">
          <h1 className="text-2xl md:text-3xl font-display font-bold">{question}</h1>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {!hasResponded ? (
          <motion.div
            key="voting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onVote(option.id)}
                disabled={submitting}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                  selectedOption === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${
                  selectedOption === option.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="font-medium">{option.text}</span>
                {showLiveResults && (
                  <span className="ml-auto text-sm text-muted-foreground">{option.votes} votes</span>
                )}
              </motion.button>
            ))}
            
            <Button
              variant="gradient"
              size="xl"
              className="w-full mt-6"
              disabled={!selectedOption || submitting}
              onClick={onSubmit}
            >
              {submitting ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </motion.div>
        ) : (
          <MCQResults options={options} selectedOption={selectedOption} totalVotes={totalVotes} maxVotes={maxVotes} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Results Components
const MCQResults = ({ options, selectedOption, totalVotes, maxVotes }: {
  options: PollOption[];
  selectedOption: string | null;
  totalVotes: number;
  maxVotes: number;
}) => (
  <motion.div
    key="results"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-3"
  >
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-spark-green/10 text-spark-green mb-2">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">Vote Submitted!</span>
      </div>
    </div>

    {options.map((option, index) => {
      const isWinning = option.votes === maxVotes && maxVotes > 0;
      const isSelected = selectedOption === option.id;
      
      return (
        <motion.div
          key={option.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`relative p-4 rounded-xl border-2 overflow-hidden ${
            isSelected ? "border-primary" : "border-border"
          }`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${option.percentage}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`absolute inset-y-0 left-0 ${
              isWinning ? "bg-primary/20" : "bg-muted"
            }`}
          />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                isWinning ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {String.fromCharCode(65 + index)}
              </div>
              <span className="font-medium">{option.text}</span>
              {isSelected && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Your vote
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{option.votes} votes</span>
              <span className={`font-display font-bold text-xl ${isWinning ? "text-primary" : "text-foreground"}`}>
                {option.percentage}%
              </span>
            </div>
          </div>
        </motion.div>
      );
    })}

    <div className="text-center text-sm text-muted-foreground mt-4">
      Total votes: {totalVotes}
    </div>
  </motion.div>
);

const YesNoResults = ({ options, selectedOption, totalVotes }: {
  options: PollOption[];
  selectedOption: string | null;
  totalVotes: number;
}) => {
  const yesVotes = options[0]?.votes || 0;
  const noVotes = options[1]?.votes || 0;
  const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercent = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-spark-green/10 text-spark-green mb-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Vote Submitted!</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`p-6 rounded-2xl border-2 text-center ${
            selectedOption === options[0]?.id ? 'border-spark-green bg-spark-green/10' : 'border-border'
          }`}
        >
          <ThumbsUp className="w-10 h-10 mx-auto mb-2 text-spark-green" />
          <div className="text-3xl font-bold text-spark-green">{yesPercent}%</div>
          <div className="text-sm text-muted-foreground">{yesVotes} votes</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`p-6 rounded-2xl border-2 text-center ${
            selectedOption === options[1]?.id ? 'border-spark-coral bg-spark-coral/10' : 'border-border'
          }`}
        >
          <ThumbsDown className="w-10 h-10 mx-auto mb-2 text-spark-coral" />
          <div className="text-3xl font-bold text-spark-coral">{noPercent}%</div>
          <div className="text-sm text-muted-foreground">{noVotes} votes</div>
        </motion.div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Total votes: {totalVotes}
      </div>
    </motion.div>
  );
};

const RatingResults = ({ options, selectedOption, totalVotes }: {
  options: PollOption[];
  selectedOption: string | null;
  totalVotes: number;
}) => {
  const averageRating = totalVotes > 0
    ? options.reduce((sum, opt) => sum + (parseInt(opt.text) * opt.votes), 0) / totalVotes
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-spark-green/10 text-spark-green mb-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Rating Submitted!</span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-6xl font-bold text-primary mb-2">{averageRating.toFixed(1)}</div>
        <div className="flex justify-center gap-1 mb-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-8 h-8 ${
                i < Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
        <div className="text-sm text-muted-foreground">Average rating from {totalVotes} responses</div>
      </div>

      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-3">
            <span className="w-8 text-sm font-medium">{option.text}★</span>
            <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${option.percentage}%` }}
                className="h-full bg-yellow-400"
              />
            </div>
            <span className="w-12 text-sm text-muted-foreground text-right">{option.votes}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default LivePoll;
