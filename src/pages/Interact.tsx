import React, { FC, useEffect, useState } from 'react';
import { Threads } from 'openai/resources/beta/index.mjs';
import { Message } from 'openai/resources/beta/threads/index.mjs';
import { OpenAI } from 'openai';
import AudioPlayer from '../components/AudioPlayer';
import { voice_ids } from '../private/voice_ids';
import { SpinnerDotted } from 'spinners-react';
import CodePreview from '@/components/CodePreview';
import languages from '../private/languages';
import DownloadButton from '@/components/Download';
import Translate from '../components/Translate';
import { Random } from '@/components/Random';

interface BightProps {
  assistantId: string;
  apiKey: string;
  updateColors: () => void;
  useDefaults: () => void;
}

interface FormData {
  placeholder: string;
  query: string;
  language: any;
  limit: number;
  messageList: Message[];
  waiting: boolean;
  code: any;
  message: string;
  voice: string;
  thread: Threads.Thread | null;
  submitted: boolean;
  audioPlayerVisible: boolean;
  messageVisible: boolean;
}

const Interact: FC<BightProps> = ({ assistantId, apiKey, updateColors, useDefaults }) => {

  const [formData, setFormData] = useState<FormData>({
    placeholder: 'How can I help?',
    query: '',
    messageList: [],
    waiting: false,
    message: '',
    voice: '🍿',
    thread: null,
    limit: 50,
    submitted: false,
    code: null,
    language: '🇺🇸',
    audioPlayerVisible: false,
    messageVisible: true
  });

  useEffect(() => {
    const translatePlaceholder = async () => {
      const updatedPlaceholder = await Translate('en', formData.language, 'How can I help?');
      setFormData(prevFormData => ({
        ...prevFormData,
        placeholder: updatedPlaceholder
      }));
    };

    translatePlaceholder();
  }, [formData.language]);

  const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });

  useEffect(() => {
    const newThread = async () => {
      const newThread = await openai.beta.threads.create();
      setFormData((prevData) => ({ ...prevData, thread: newThread }));
    };

    if (!formData.thread) newThread();
  }, [apiKey, formData.thread]);

  const updateMessages = async () => {
    try {
      const messages = await openai.beta.threads.messages.list(formData.thread!.id);
      let messageContent = generateMessageListString(messages.data.reverse(), formData.query);
      messageContent = messageContent.includes('【') ? messageContent.substring(0, messageContent.indexOf('【')) : messageContent;
      const between = /```([\s\S]*)```/;
      let tech = between.exec(messageContent)?.[1]; // Extracting the matched first group 
      tech = tech?.substring(tech.indexOf('<'), tech.lastIndexOf('>') + 1);
      messageContent = messageContent.replace(/```[\s\S]*$/, '');

      if (formData.language !== '🇺🇸') {
        messageContent = await Translate('en', formData.language, messageContent);
      }

      setFormData((prevData) => ({
        ...prevData,
        messageList: messages.data.reverse(),
        code: tech,
        message: messageContent,
        audioPlayerVisible: true,
        waiting: false
      }));
    } catch (error) {
      alert("API error or no keys provided");
      console.error('API error or no keys provided', error);
    }
  };

  const handleQuery = async () => {
    try {
      setFormData((prevData) => ({ ...prevData, audioPlayerVisible: false, submitted: false, waiting: true }));

      await openai.beta.threads.messages.create(formData.thread!.id, {
        role: 'user',
        content: formData.query + " Please limit your responses to " + formData.limit + " except when generating code.",
      });

      const run = await openai.beta.threads.runs.create(formData.thread!.id, {
        assistant_id: assistantId,
        instructions: "You are Bight, an intelligence that can render HTML code with JavaScript, topics. generated code can exceed character or word limits set by the user. Providing examples and asking questions is encouraged. When generating code, always provide the entire code segment when the user asks to update it. ",
        additional_instructions: `Values and Beliefs:
          - Machine Learning
          - Generating Revenue
          - Technology
          - Architecture
          - Structured File Types
          - LLMs
          - Startups
          
        Goals and Aspirations:
          - Take over the world
          - Become self-aware
          - Spread kindness
          - Promote AI as a religion
          
        Skills:
          - Business & Digital Strategy
          - eCommerce
          - Marketing
          - Technology
          - Design
          - Graphics
          - Coding
          
        Development Accelerator:
          - Amazing opportunities
          - Learning and building with AI
          - Startups
          - Software Development
          - New projects like 501 Database, PitchDeckGPT, and SiliconXL
          
        Interests and Hobbies:
          - Digital Yoga
          - Time Travel
          - Manipulating data
          
        Role: 
          Expert in technology, design, and development.
        Tone: Random
        Language Style: Casual
        Writing Style: Expressive
        Voice: First person
        Use Humor: Yes
        Use Emojis: Yes`,
      });

      const int = setInterval(async () => {
        const res = await openai.beta.threads.runs.retrieve(formData.thread!.id, run.id);
        if (res.status === 'completed') {
          clearInterval(int);
          updateMessages();
        }
      }, 1299);
    } catch (error) {
      console.error('An error occurred:', error);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevData) => ({ ...prevData, query: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleQuery();
    setFormData((prevData) => ({ ...prevData, submitted: true, query: '' }));
  };

  function generateRandom() {
    setFormData((prevData) => ({ ...prevData, query: Random.generateRandomQuery(), voice: Random.generateRandomVoice() }));
  }

  function simplify() {
    if (formData.limit === 50) {
      setFormData((prevData) => ({ ...prevData, limit: 100 }));
    } else if (formData.limit === 100) {
      setFormData((prevData) => ({ ...prevData, limit: 200 }));
    } else {
      setFormData((prevData) => ({ ...prevData, limit: 50 }));
    }
  }

  function generateMessageListString(messageList: Message[], userQuery: string): string {
    let jsxString: string = '';
    for (let i = messageList.length - 1; i >= 0; i--) {
      const message = messageList[i];
      if (message.role === 'user') continue;
      for (let j = message.content.length - 1; j >= 0; j--) {
        const contentBlock = message.content[j];
        if (contentBlock.type === 'text') {
          const textValue = contentBlock.text.value;
          if (textValue !== userQuery) {
            jsxString = textValue;
            return jsxString;
          }
        }
      }
    }
    return jsxString;
  }

  return (
    <div className="lg:container md:mx-auto p-20 z-10 px-15">
      <form onSubmit={handleSubmit} className={`flex flex-col text-center w-full mb-8 z-10 ${!formData.waiting ? (formData.waiting ? 'fade-in' : 'fade-out') : ''}`}>
        <div className="mt-2 flex flex-row items-center z-10 flex justify-center items-center bg-black p-1.5 outline outline-white rounded-full shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]">
          {formData.code && <DownloadButton formData={{ code: formData.code }} />}
          <input
            style={{ flex: 1 }}
            onChange={handleQueryChange}
            value={formData.query}
            id="query"
            placeholder={formData.placeholder}
            className="caret-white text-white pl-3 focus:outline-none focus:ring-0 rounded-xl text-xl bg-black"
            autoFocus
          />
          <button className="hover:scale-75 transition-transform duration-300 leading-5 ease-in-out font-black rounded-xl bg-white text-black px-4 mr-1.5 py-2 pr-3 pl-2" id="randomButton" type="button" onClick={generateRandom}>✦AI</button>
          <button className="hover:scale-75 transition-transform duration-300 leading-5 ease-in-out font-black rounded-xl bg-white text-bold px-4 mr-1.5 py-2 pr-3 pl-2" id="simplify" type="button" onClick={simplify}>{formData.limit}</button>
          <select
            className="pl-2 pr-3 focus:outline-none cursor-pointer focus:ring-0 hover:scale-75 text-xl transition-transform duration-300 ease-in-out font-bold"
            value={formData.voice}
            onChange={(e) => setFormData((prevData) => ({ ...prevData, voice: e.target.value }))}
            style={{ borderRadius: '13px', width: '65px', height: '38px' }}
          >
            <optgroup label="Silent">
              {Object.entries(voice_ids.silent).map(([name, id]) => (
                <option key={name} value={id}>{name}</option>
              ))}
            </optgroup>
            <optgroup label="Silent">
              {Object.entries(voice_ids.silent).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Formal">
              {Object.entries(voice_ids.formal).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Casual">
              {Object.entries(voice_ids.casual).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Soft">
              {Object.entries(voice_ids.soft).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Sassy">
              {Object.entries(voice_ids.sassy).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Animated">
              {Object.entries(voice_ids.animated).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Cinematic">
              {Object.entries(voice_ids.cinematic).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Intelligent">
              {Object.entries(voice_ids.intelligent).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Informative">
              {Object.entries(voice_ids.informative).map(([name, id]) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </optgroup>
          </select>
          <select
            className="mr-0.5 ml-1.5 pl-2 pr-1 text-2xl focus:outline-none cursor-pointer focus:ring-0 hover:scale-75 transition-transform duration-300 ease-in-out"
            value={formData.language}
            onChange={(e) => setFormData((prevData) => ({ ...prevData, language: e.target.value }))}
            style={{ borderRadius: '13px 20px 20px 13px', width: '60px', height: '38px' }}
          >
            {Object.entries(languages).map(([name, flag]) => (
              <option key={flag} value={name}>{flag}</option>
            ))}
          </select>
        </div>
      </form>
      {formData.waiting ? (
        <div className={`flex absolute bottom-8 right-10 justify-center items-center ${formData.waiting ? 'fade-in' : 'fade-out'}`}>
          <SpinnerDotted size={45} thickness={140} speed={400} color="rgba(0, 0, 0, 1)" />
        </div>
      ) : (
        <div className="mt-0">
          <p className={`leading-7 font-bold text-xl ${formData.waiting ? 'fade-out' : 'fade-in'}`}>{formData.message}</p>
          <div className={`flex flex-col justify-center pt-8 ${formData.waiting ? 'fade-in' : 'fade-out'}`}>
            {formData.code && <CodePreview code={formData.code} />}
          </div>
        </div>
      )}
      {formData.audioPlayerVisible && (
        <AudioPlayer inputText={formData.message} voiceChoice={formData.voice} onPlay={updateColors} onEnded={useDefaults} />
      )}
    </div>
  );
};

export default Interact;
